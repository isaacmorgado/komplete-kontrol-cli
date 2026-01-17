
        #!/bin/bash
        set -e

        # Extract goal
        GOAL="Create a simple Node.js app with index.js"
        MAX_ITERATIONS=5
        MODEL="glm-4.7"

        # Call ReflexionCommand via CLI
        OUTPUT=$(/Users/imorgado/Desktop/Projects/komplete-kontrol-cli/dist/index.js reflexion execute           --goal "$GOAL"           --max-iterations "$MAX_ITERATIONS"           --preferred-model "$MODEL"           --output-json)

        # Parse final result with jq
        STATUS=$(echo "$OUTPUT" | tail -1 | jq -r '.status')
        SUCCESS=$(echo "$OUTPUT" | tail -1 | jq -r '.success')
        ITERATIONS=$(echo "$OUTPUT" | tail -1 | jq -r '.iterations')

        # Echo results for parent script
        echo "STATUS=$STATUS"
        echo "SUCCESS=$SUCCESS"
        echo "ITERATIONS=$ITERATIONS"

        # Exit with appropriate code
        if [[ "$SUCCESS" == "true" ]]; then
          exit 0
        else
          exit 1
        fi
      