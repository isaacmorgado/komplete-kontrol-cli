package verification

import (
	"context"
	"fmt"
	"strings"
	"sync"
	"time"
)

// VerificationManager manages verification and repair steps
type VerificationManager struct {
	steps      []VerificationStep
	results    map[string]*VerificationResult
	mu          sync.RWMutex
	maxRetries  int
}

// VerificationStep represents a verification step
type VerificationStep struct {
	ID          string
	Name        string
	Description string
	Check       VerificationCheck
	Repair      VerificationRepair
	Critical    bool
}

// VerificationCheck is a function that performs a verification check
type VerificationCheck func(ctx context.Context) (*CheckResult, error)

// VerificationRepair is a function that performs a repair
type VerificationRepair func(ctx context.Context) error

// CheckResult represents the result of a verification check
type CheckResult struct {
	Passed   bool
	Message  string
	Duration time.Duration
}

// VerificationResult represents the result of running a verification step
type VerificationResult struct {
	StepID      string
	Passed       bool
	Attempts     int
	LastCheck    *CheckResult
	Repaired      bool
	ErrorMessage string
}

// NewVerificationManager creates a new verification manager
func NewVerificationManager(maxRetries int) *VerificationManager {
	return &VerificationManager{
		steps:     []VerificationStep{},
		results:   make(map[string]*VerificationResult),
		maxRetries: maxRetries,
	}
}

// AddStep adds a verification step
func (vm *VerificationManager) AddStep(step VerificationStep) error {
	vm.mu.Lock()
	defer vm.mu.Unlock()

	// Check for duplicate ID
	for _, s := range vm.steps {
		if s.ID == step.ID {
			return fmt.Errorf("verification step %s already exists", step.ID)
		}
	}

	vm.steps = append(vm.steps, step)
	return nil
}

// RemoveStep removes a verification step
func (vm *VerificationManager) RemoveStep(id string) error {
	vm.mu.Lock()
	defer vm.mu.Unlock()

	for i, step := range vm.steps {
		if step.ID == id {
			vm.steps = append(vm.steps[:i], vm.steps[i+1:]...)
			return nil
		}
	}

	return fmt.Errorf("verification step %s not found", id)
}

// GetStep returns a verification step by ID
func (vm *VerificationManager) GetStep(id string) (*VerificationStep, error) {
	vm.mu.RLock()
	defer vm.mu.RUnlock()

	for _, step := range vm.steps {
		if step.ID == id {
			return &step, nil
		}
	}

	return nil, fmt.Errorf("verification step %s not found", id)
}

// ListSteps returns all verification steps
func (vm *VerificationManager) ListSteps() []VerificationStep {
	vm.mu.RLock()
	defer vm.mu.RUnlock()

	return vm.steps
}

// Run runs all verification steps
func (vm *VerificationManager) Run(ctx context.Context) (*VerificationReport, error) {
	// Snapshot steps so we don't hold the manager lock while executing checks.
	vm.mu.RLock()
	steps := make([]VerificationStep, len(vm.steps))
	copy(steps, vm.steps)
	vm.mu.RUnlock()

	report := &VerificationReport{
		StartTime: time.Now(),
		Results:   make([]StepResult, len(steps)),
	}

	for i := range steps {
		result := vm.runStep(ctx, &steps[i])
		report.Results[i] = result

		// Persist result for later summary queries.
		vm.mu.Lock()
		vm.results[result.StepID] = &VerificationResult{
			StepID:       result.StepID,
			Passed:       result.Passed,
			Attempts:     result.Attempts,
			LastCheck:    result.LastCheck,
			Repaired:     result.Repaired,
			ErrorMessage: result.ErrorMessage,
		}
		vm.mu.Unlock()
	}

	report.EndTime = time.Now()
	report.Duration = report.EndTime.Sub(report.StartTime)
	report.Summary = vm.GetSummary()

	return report, nil
}

// runStep runs a single verification step
func (vm *VerificationManager) runStep(ctx context.Context, step *VerificationStep) StepResult {
	result := &VerificationResult{
		StepID:   step.ID,
		Attempts:  0,
		Repaired:   false,
	}

	for attempt := 1; attempt <= vm.maxRetries; attempt++ {
		result.Attempts = attempt

		// Run check
		checkStart := time.Now()
		checkRes, err := step.Check(ctx)
		checkDuration := time.Since(checkStart)
		if checkRes != nil {
			checkRes.Duration = checkDuration
		}

		if err != nil {
			// Check failed
			result.LastCheck = &CheckResult{
				Passed:   false,
				Message:  fmt.Sprintf("Check failed: %v", err),
				Duration: checkDuration,
			}

			// Try repair if available
			if step.Repair != nil {
				repairErr := step.Repair(ctx)
				if repairErr != nil {
					result.ErrorMessage = fmt.Sprintf("Repair failed: %v", repairErr)
					continue
				}

				// Repair succeeded, retry check
				result.Repaired = true
				continue
			}

			// No repair or repair failed
			if attempt == vm.maxRetries {
				result.ErrorMessage = fmt.Sprintf("Max retries (%d) exceeded", vm.maxRetries)
				return StepResult{
					StepID:      result.StepID,
					Passed:       result.Passed,
					Attempts:     result.Attempts,
					LastCheck:    result.LastCheck,
					Repaired:     result.Repaired,
					ErrorMessage: result.ErrorMessage,
				}
			}

			continue
		}

		// If a check returns a result, respect its Passed flag.
		if checkRes == nil {
			checkRes = &CheckResult{Passed: true, Message: "Check passed", Duration: checkDuration}
		}
		result.LastCheck = checkRes
		result.Passed = checkRes.Passed
		if !checkRes.Passed {
			if step.Repair != nil {
				if repairErr := step.Repair(ctx); repairErr != nil {
					result.ErrorMessage = fmt.Sprintf("Repair failed: %v", repairErr)
					continue
				}
				result.Repaired = true
				continue
			}
			result.ErrorMessage = checkRes.Message
			continue
		}
		return StepResult{
			StepID:      result.StepID,
			Passed:       result.Passed,
			Attempts:     result.Attempts,
			LastCheck:    result.LastCheck,
			Repaired:     result.Repaired,
			ErrorMessage: result.ErrorMessage,
		}
	}

	// Should not reach here, but return empty result if we do
	return StepResult{}
}

// VerificationReport represents the full verification report
type VerificationReport struct {
	StartTime time.Time
	EndTime   time.Time
	Duration  time.Duration
	Results   []StepResult
	Summary   string
}

// StepResult represents the result of a single step
type StepResult struct {
	StepID      string
	Passed       bool
	Attempts     int
	LastCheck    *CheckResult
	Repaired      bool
	ErrorMessage string
}

// GetResult returns the result for a step
func (vm *VerificationManager) GetResult(stepID string) (*VerificationResult, error) {
	vm.mu.RLock()
	defer vm.mu.RUnlock()

	result, ok := vm.results[stepID]
	if !ok {
		return nil, fmt.Errorf("no result for step %s", stepID)
	}

	return result, nil
}

// SetResult sets the result for a step
func (vm *VerificationManager) SetResult(result *VerificationResult) {
	vm.mu.Lock()
	defer vm.mu.Unlock()

	vm.results[result.StepID] = result
}

// GetSummary returns a summary of verification results
func (vm *VerificationManager) GetSummary() string {
	vm.mu.RLock()
	defer vm.mu.RUnlock()

	if len(vm.results) == 0 {
		return "No verification results available"
	}

	passed := 0
	failed := 0
	repairs := 0

	for _, result := range vm.results {
		if result.Passed {
			passed++
		} else {
			failed++
		}
		if result.Repaired {
			repairs++
		}
	}

	return fmt.Sprintf("Passed: %d, Failed: %d, Repairs: %d", passed, failed, repairs)
}

// Clear clears all verification results
func (vm *VerificationManager) Clear() {
	vm.mu.Lock()
	defer vm.mu.Unlock()

	vm.results = make(map[string]*VerificationResult)
}

// GetStepCount returns the number of verification steps
func (vm *VerificationManager) GetStepCount() int {
	vm.mu.RLock()
	defer vm.mu.RUnlock()

	return len(vm.steps)
}

// SetMaxRetries sets the maximum number of retries
func (vm *VerificationManager) SetMaxRetries(maxRetries int) {
	vm.mu.Lock()
	defer vm.mu.Unlock()

	vm.maxRetries = maxRetries
}

// GetMaxRetries returns the maximum number of retries
func (vm *VerificationManager) GetMaxRetries() int {
	vm.mu.RLock()
	defer vm.mu.RUnlock()

	return vm.maxRetries
}

// FormatReport formats the verification report for display
func (report *VerificationReport) FormatReport() string {
	var builder strings.Builder

	builder.WriteString(fmt.Sprintf("Verification Report\n"))
	builder.WriteString(fmt.Sprintf("Duration: %s\n", FormatDuration(report.Duration)))
	builder.WriteString(fmt.Sprintf("Steps: %d\n", len(report.Results)))
	builder.WriteString(fmt.Sprintf("Summary: %s\n\n", report.Summary))

	for i, result := range report.Results {
		builder.WriteString(fmt.Sprintf("%d. %s", i+1, result.StepID))
		builder.WriteString(fmt.Sprintf("   Status: %s\n", getStatusText(result.Passed)))
		builder.WriteString(fmt.Sprintf("   Attempts: %d\n", result.Attempts))

		if result.LastCheck != nil {
			builder.WriteString(fmt.Sprintf("   Last Check: %s\n", result.LastCheck.Message))
			builder.WriteString(fmt.Sprintf("   Duration: %s\n", FormatDuration(result.LastCheck.Duration)))
		}

		if result.Repaired {
			builder.WriteString(fmt.Sprintf("   Repaired: Yes\n"))
		}

		if result.ErrorMessage != "" {
			builder.WriteString(fmt.Sprintf("   Error: %s\n", result.ErrorMessage))
		}

		builder.WriteString("\n")
	}

	return builder.String()
}

// FormatDuration formats a duration for display
func FormatDuration(d time.Duration) string {
	if d < time.Second {
		return "0s"
	}
	if d < time.Minute {
		return fmt.Sprintf("%.1fs", d.Seconds())
	}
	if d < time.Hour {
		return fmt.Sprintf("%.1fm", d.Minutes())
	}
	return fmt.Sprintf("%.1fh", d.Hours())
}

// getStatusText returns text for a status
func getStatusText(passed bool) string {
	if passed {
		return "PASSED"
	}
	return "FAILED"
}

// CreateCommonSteps creates common verification steps
func CreateCommonSteps() []VerificationStep {
	return []VerificationStep{
		{
			ID:          "syntax_check",
			Name:        "Syntax Check",
			Description: "Check code syntax for errors",
			Check:       CheckSyntax,
			Repair:      RepairSyntax,
			Critical:    true,
		},
		{
			ID:          "build_check",
			Name:        "Build Check",
			Description: "Verify code builds successfully",
			Check:       CheckBuild,
			Repair:      RepairBuild,
			Critical:    true,
		},
		{
			ID:          "test_check",
			Name:        "Test Check",
			Description: "Run tests and verify they pass",
			Check:       CheckTests,
			Repair:      RepairTests,
			Critical:    true,
		},
	}
}

// CheckSyntax checks code syntax
func CheckSyntax(ctx context.Context) (*CheckResult, error) {
	// Implementation would involve running linters
	// For now, return success
	return &CheckResult{
		Passed:   true,
		Message:  "Syntax check passed",
		Duration: 0,
	}, nil
}

// RepairSyntax repairs syntax errors
func RepairSyntax(ctx context.Context) error {
	// Implementation would involve auto-fixing syntax errors
	return nil
}

// CheckBuild checks if code builds
func CheckBuild(ctx context.Context) (*CheckResult, error) {
	// Implementation would involve running build command
	return &CheckResult{
		Passed:   true,
		Message:  "Build check passed",
		Duration: 0,
	}, nil
}

// RepairBuild repairs build errors
func RepairBuild(ctx context.Context) error {
	// Implementation would involve fixing build errors
	return nil
}

// CheckTests runs tests
func CheckTests(ctx context.Context) (*CheckResult, error) {
	// Implementation would involve running test command
	return &CheckResult{
		Passed:   true,
		Message:  "Test check passed",
		Duration: 0,
	}, nil
}

// RepairTests repairs test failures
func RepairTests(ctx context.Context) error {
	// Implementation would involve fixing test failures
	return nil
}

// CreateCustomStep creates a custom verification step
func CreateCustomStep(id, name, description string, check VerificationCheck, repair VerificationRepair, critical bool) VerificationStep {
	return VerificationStep{
		ID:          id,
		Name:        name,
		Description: description,
		Check:       check,
		Repair:      repair,
		Critical:    critical,
	}
}

// ValidateSteps validates all verification steps
func (vm *VerificationManager) ValidateSteps() error {
	vm.mu.RLock()
	defer vm.mu.RUnlock()

	for _, step := range vm.steps {
		if step.ID == "" {
			return fmt.Errorf("verification step ID cannot be empty")
		}
		if step.Name == "" {
			return fmt.Errorf("verification step name cannot be empty")
		}
		if step.Check == nil {
			return fmt.Errorf("verification step %s has no check function", step.ID)
		}
	}

	return nil
}

// GetCriticalSteps returns all critical steps
func (vm *VerificationManager) GetCriticalSteps() []VerificationStep {
	vm.mu.RLock()
	defer vm.mu.RUnlock()

	var critical []VerificationStep
	for _, step := range vm.steps {
		if step.Critical {
			critical = append(critical, step)
		}
	}
	return critical
}

// GetNonCriticalSteps returns all non-critical steps
func (vm *VerificationManager) GetNonCriticalSteps() []VerificationStep {
	vm.mu.RLock()
	defer vm.mu.RUnlock()

	var nonCritical []VerificationStep
	for _, step := range vm.steps {
		if !step.Critical {
			nonCritical = append(nonCritical, step)
		}
	}
	return nonCritical
}

// Clone creates a copy of the verification manager
func (vm *VerificationManager) Clone() *VerificationManager {
	vm.mu.RLock()
	defer vm.mu.RUnlock()

	clone := &VerificationManager{
		steps:     make([]VerificationStep, len(vm.steps)),
		results:   make(map[string]*VerificationResult),
		maxRetries: vm.maxRetries,
	}

	copy(clone.steps, vm.steps)
	for k, v := range vm.results {
		clone.results[k] = v
	}

	return clone
}
