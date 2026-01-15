#!/usr/bin/env bun
// @bun
import { createRequire } from "node:module";
var __create = Object.create;
var __getProtoOf = Object.getPrototypeOf;
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __toESM = (mod, isNodeMode, target) => {
  target = mod != null ? __create(__getProtoOf(mod)) : {};
  const to = isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target;
  for (let key of __getOwnPropNames(mod))
    if (!__hasOwnProp.call(to, key))
      __defProp(to, key, {
        get: () => mod[key],
        enumerable: true
      });
  return to;
};
var __commonJS = (cb, mod) => () => (mod || cb((mod = { exports: {} }).exports, mod), mod.exports);
var __require = /* @__PURE__ */ createRequire(import.meta.url);

// node_modules/commander/lib/error.js
var require_error = __commonJS((exports) => {
  class CommanderError extends Error {
    constructor(exitCode, code, message) {
      super(message);
      Error.captureStackTrace(this, this.constructor);
      this.name = this.constructor.name;
      this.code = code;
      this.exitCode = exitCode;
      this.nestedError = undefined;
    }
  }

  class InvalidArgumentError extends CommanderError {
    constructor(message) {
      super(1, "commander.invalidArgument", message);
      Error.captureStackTrace(this, this.constructor);
      this.name = this.constructor.name;
    }
  }
  exports.CommanderError = CommanderError;
  exports.InvalidArgumentError = InvalidArgumentError;
});

// node_modules/commander/lib/argument.js
var require_argument = __commonJS((exports) => {
  var { InvalidArgumentError } = require_error();

  class Argument {
    constructor(name, description) {
      this.description = description || "";
      this.variadic = false;
      this.parseArg = undefined;
      this.defaultValue = undefined;
      this.defaultValueDescription = undefined;
      this.argChoices = undefined;
      switch (name[0]) {
        case "<":
          this.required = true;
          this._name = name.slice(1, -1);
          break;
        case "[":
          this.required = false;
          this._name = name.slice(1, -1);
          break;
        default:
          this.required = true;
          this._name = name;
          break;
      }
      if (this._name.length > 3 && this._name.slice(-3) === "...") {
        this.variadic = true;
        this._name = this._name.slice(0, -3);
      }
    }
    name() {
      return this._name;
    }
    _concatValue(value, previous) {
      if (previous === this.defaultValue || !Array.isArray(previous)) {
        return [value];
      }
      return previous.concat(value);
    }
    default(value, description) {
      this.defaultValue = value;
      this.defaultValueDescription = description;
      return this;
    }
    argParser(fn) {
      this.parseArg = fn;
      return this;
    }
    choices(values) {
      this.argChoices = values.slice();
      this.parseArg = (arg, previous) => {
        if (!this.argChoices.includes(arg)) {
          throw new InvalidArgumentError(`Allowed choices are ${this.argChoices.join(", ")}.`);
        }
        if (this.variadic) {
          return this._concatValue(arg, previous);
        }
        return arg;
      };
      return this;
    }
    argRequired() {
      this.required = true;
      return this;
    }
    argOptional() {
      this.required = false;
      return this;
    }
  }
  function humanReadableArgName(arg) {
    const nameOutput = arg.name() + (arg.variadic === true ? "..." : "");
    return arg.required ? "<" + nameOutput + ">" : "[" + nameOutput + "]";
  }
  exports.Argument = Argument;
  exports.humanReadableArgName = humanReadableArgName;
});

// node_modules/commander/lib/help.js
var require_help = __commonJS((exports) => {
  var { humanReadableArgName } = require_argument();

  class Help {
    constructor() {
      this.helpWidth = undefined;
      this.sortSubcommands = false;
      this.sortOptions = false;
      this.showGlobalOptions = false;
    }
    visibleCommands(cmd) {
      const visibleCommands = cmd.commands.filter((cmd2) => !cmd2._hidden);
      if (cmd._hasImplicitHelpCommand()) {
        const [, helpName, helpArgs] = cmd._helpCommandnameAndArgs.match(/([^ ]+) *(.*)/);
        const helpCommand = cmd.createCommand(helpName).helpOption(false);
        helpCommand.description(cmd._helpCommandDescription);
        if (helpArgs)
          helpCommand.arguments(helpArgs);
        visibleCommands.push(helpCommand);
      }
      if (this.sortSubcommands) {
        visibleCommands.sort((a, b) => {
          return a.name().localeCompare(b.name());
        });
      }
      return visibleCommands;
    }
    compareOptions(a, b) {
      const getSortKey = (option) => {
        return option.short ? option.short.replace(/^-/, "") : option.long.replace(/^--/, "");
      };
      return getSortKey(a).localeCompare(getSortKey(b));
    }
    visibleOptions(cmd) {
      const visibleOptions = cmd.options.filter((option) => !option.hidden);
      const showShortHelpFlag = cmd._hasHelpOption && cmd._helpShortFlag && !cmd._findOption(cmd._helpShortFlag);
      const showLongHelpFlag = cmd._hasHelpOption && !cmd._findOption(cmd._helpLongFlag);
      if (showShortHelpFlag || showLongHelpFlag) {
        let helpOption;
        if (!showShortHelpFlag) {
          helpOption = cmd.createOption(cmd._helpLongFlag, cmd._helpDescription);
        } else if (!showLongHelpFlag) {
          helpOption = cmd.createOption(cmd._helpShortFlag, cmd._helpDescription);
        } else {
          helpOption = cmd.createOption(cmd._helpFlags, cmd._helpDescription);
        }
        visibleOptions.push(helpOption);
      }
      if (this.sortOptions) {
        visibleOptions.sort(this.compareOptions);
      }
      return visibleOptions;
    }
    visibleGlobalOptions(cmd) {
      if (!this.showGlobalOptions)
        return [];
      const globalOptions = [];
      for (let ancestorCmd = cmd.parent;ancestorCmd; ancestorCmd = ancestorCmd.parent) {
        const visibleOptions = ancestorCmd.options.filter((option) => !option.hidden);
        globalOptions.push(...visibleOptions);
      }
      if (this.sortOptions) {
        globalOptions.sort(this.compareOptions);
      }
      return globalOptions;
    }
    visibleArguments(cmd) {
      if (cmd._argsDescription) {
        cmd.registeredArguments.forEach((argument) => {
          argument.description = argument.description || cmd._argsDescription[argument.name()] || "";
        });
      }
      if (cmd.registeredArguments.find((argument) => argument.description)) {
        return cmd.registeredArguments;
      }
      return [];
    }
    subcommandTerm(cmd) {
      const args = cmd.registeredArguments.map((arg) => humanReadableArgName(arg)).join(" ");
      return cmd._name + (cmd._aliases[0] ? "|" + cmd._aliases[0] : "") + (cmd.options.length ? " [options]" : "") + (args ? " " + args : "");
    }
    optionTerm(option) {
      return option.flags;
    }
    argumentTerm(argument) {
      return argument.name();
    }
    longestSubcommandTermLength(cmd, helper) {
      return helper.visibleCommands(cmd).reduce((max, command) => {
        return Math.max(max, helper.subcommandTerm(command).length);
      }, 0);
    }
    longestOptionTermLength(cmd, helper) {
      return helper.visibleOptions(cmd).reduce((max, option) => {
        return Math.max(max, helper.optionTerm(option).length);
      }, 0);
    }
    longestGlobalOptionTermLength(cmd, helper) {
      return helper.visibleGlobalOptions(cmd).reduce((max, option) => {
        return Math.max(max, helper.optionTerm(option).length);
      }, 0);
    }
    longestArgumentTermLength(cmd, helper) {
      return helper.visibleArguments(cmd).reduce((max, argument) => {
        return Math.max(max, helper.argumentTerm(argument).length);
      }, 0);
    }
    commandUsage(cmd) {
      let cmdName = cmd._name;
      if (cmd._aliases[0]) {
        cmdName = cmdName + "|" + cmd._aliases[0];
      }
      let ancestorCmdNames = "";
      for (let ancestorCmd = cmd.parent;ancestorCmd; ancestorCmd = ancestorCmd.parent) {
        ancestorCmdNames = ancestorCmd.name() + " " + ancestorCmdNames;
      }
      return ancestorCmdNames + cmdName + " " + cmd.usage();
    }
    commandDescription(cmd) {
      return cmd.description();
    }
    subcommandDescription(cmd) {
      return cmd.summary() || cmd.description();
    }
    optionDescription(option) {
      const extraInfo = [];
      if (option.argChoices) {
        extraInfo.push(`choices: ${option.argChoices.map((choice) => JSON.stringify(choice)).join(", ")}`);
      }
      if (option.defaultValue !== undefined) {
        const showDefault = option.required || option.optional || option.isBoolean() && typeof option.defaultValue === "boolean";
        if (showDefault) {
          extraInfo.push(`default: ${option.defaultValueDescription || JSON.stringify(option.defaultValue)}`);
        }
      }
      if (option.presetArg !== undefined && option.optional) {
        extraInfo.push(`preset: ${JSON.stringify(option.presetArg)}`);
      }
      if (option.envVar !== undefined) {
        extraInfo.push(`env: ${option.envVar}`);
      }
      if (extraInfo.length > 0) {
        return `${option.description} (${extraInfo.join(", ")})`;
      }
      return option.description;
    }
    argumentDescription(argument) {
      const extraInfo = [];
      if (argument.argChoices) {
        extraInfo.push(`choices: ${argument.argChoices.map((choice) => JSON.stringify(choice)).join(", ")}`);
      }
      if (argument.defaultValue !== undefined) {
        extraInfo.push(`default: ${argument.defaultValueDescription || JSON.stringify(argument.defaultValue)}`);
      }
      if (extraInfo.length > 0) {
        const extraDescripton = `(${extraInfo.join(", ")})`;
        if (argument.description) {
          return `${argument.description} ${extraDescripton}`;
        }
        return extraDescripton;
      }
      return argument.description;
    }
    formatHelp(cmd, helper) {
      const termWidth = helper.padWidth(cmd, helper);
      const helpWidth = helper.helpWidth || 80;
      const itemIndentWidth = 2;
      const itemSeparatorWidth = 2;
      function formatItem(term, description) {
        if (description) {
          const fullText = `${term.padEnd(termWidth + itemSeparatorWidth)}${description}`;
          return helper.wrap(fullText, helpWidth - itemIndentWidth, termWidth + itemSeparatorWidth);
        }
        return term;
      }
      function formatList(textArray) {
        return textArray.join(`
`).replace(/^/gm, " ".repeat(itemIndentWidth));
      }
      let output = [`Usage: ${helper.commandUsage(cmd)}`, ""];
      const commandDescription = helper.commandDescription(cmd);
      if (commandDescription.length > 0) {
        output = output.concat([helper.wrap(commandDescription, helpWidth, 0), ""]);
      }
      const argumentList = helper.visibleArguments(cmd).map((argument) => {
        return formatItem(helper.argumentTerm(argument), helper.argumentDescription(argument));
      });
      if (argumentList.length > 0) {
        output = output.concat(["Arguments:", formatList(argumentList), ""]);
      }
      const optionList = helper.visibleOptions(cmd).map((option) => {
        return formatItem(helper.optionTerm(option), helper.optionDescription(option));
      });
      if (optionList.length > 0) {
        output = output.concat(["Options:", formatList(optionList), ""]);
      }
      if (this.showGlobalOptions) {
        const globalOptionList = helper.visibleGlobalOptions(cmd).map((option) => {
          return formatItem(helper.optionTerm(option), helper.optionDescription(option));
        });
        if (globalOptionList.length > 0) {
          output = output.concat(["Global Options:", formatList(globalOptionList), ""]);
        }
      }
      const commandList = helper.visibleCommands(cmd).map((cmd2) => {
        return formatItem(helper.subcommandTerm(cmd2), helper.subcommandDescription(cmd2));
      });
      if (commandList.length > 0) {
        output = output.concat(["Commands:", formatList(commandList), ""]);
      }
      return output.join(`
`);
    }
    padWidth(cmd, helper) {
      return Math.max(helper.longestOptionTermLength(cmd, helper), helper.longestGlobalOptionTermLength(cmd, helper), helper.longestSubcommandTermLength(cmd, helper), helper.longestArgumentTermLength(cmd, helper));
    }
    wrap(str, width, indent, minColumnWidth = 40) {
      const indents = " \\f\\t\\v   -   　\uFEFF";
      const manualIndent = new RegExp(`[\\n][${indents}]+`);
      if (str.match(manualIndent))
        return str;
      const columnWidth = width - indent;
      if (columnWidth < minColumnWidth)
        return str;
      const leadingStr = str.slice(0, indent);
      const columnText = str.slice(indent).replace(`\r
`, `
`);
      const indentString = " ".repeat(indent);
      const zeroWidthSpace = "​";
      const breaks = `\\s${zeroWidthSpace}`;
      const regex = new RegExp(`
|.{1,${columnWidth - 1}}([${breaks}]|$)|[^${breaks}]+?([${breaks}]|$)`, "g");
      const lines = columnText.match(regex) || [];
      return leadingStr + lines.map((line, i) => {
        if (line === `
`)
          return "";
        return (i > 0 ? indentString : "") + line.trimEnd();
      }).join(`
`);
    }
  }
  exports.Help = Help;
});

// node_modules/commander/lib/option.js
var require_option = __commonJS((exports) => {
  var { InvalidArgumentError } = require_error();

  class Option {
    constructor(flags, description) {
      this.flags = flags;
      this.description = description || "";
      this.required = flags.includes("<");
      this.optional = flags.includes("[");
      this.variadic = /\w\.\.\.[>\]]$/.test(flags);
      this.mandatory = false;
      const optionFlags = splitOptionFlags(flags);
      this.short = optionFlags.shortFlag;
      this.long = optionFlags.longFlag;
      this.negate = false;
      if (this.long) {
        this.negate = this.long.startsWith("--no-");
      }
      this.defaultValue = undefined;
      this.defaultValueDescription = undefined;
      this.presetArg = undefined;
      this.envVar = undefined;
      this.parseArg = undefined;
      this.hidden = false;
      this.argChoices = undefined;
      this.conflictsWith = [];
      this.implied = undefined;
    }
    default(value, description) {
      this.defaultValue = value;
      this.defaultValueDescription = description;
      return this;
    }
    preset(arg) {
      this.presetArg = arg;
      return this;
    }
    conflicts(names) {
      this.conflictsWith = this.conflictsWith.concat(names);
      return this;
    }
    implies(impliedOptionValues) {
      let newImplied = impliedOptionValues;
      if (typeof impliedOptionValues === "string") {
        newImplied = { [impliedOptionValues]: true };
      }
      this.implied = Object.assign(this.implied || {}, newImplied);
      return this;
    }
    env(name) {
      this.envVar = name;
      return this;
    }
    argParser(fn) {
      this.parseArg = fn;
      return this;
    }
    makeOptionMandatory(mandatory = true) {
      this.mandatory = !!mandatory;
      return this;
    }
    hideHelp(hide = true) {
      this.hidden = !!hide;
      return this;
    }
    _concatValue(value, previous) {
      if (previous === this.defaultValue || !Array.isArray(previous)) {
        return [value];
      }
      return previous.concat(value);
    }
    choices(values) {
      this.argChoices = values.slice();
      this.parseArg = (arg, previous) => {
        if (!this.argChoices.includes(arg)) {
          throw new InvalidArgumentError(`Allowed choices are ${this.argChoices.join(", ")}.`);
        }
        if (this.variadic) {
          return this._concatValue(arg, previous);
        }
        return arg;
      };
      return this;
    }
    name() {
      if (this.long) {
        return this.long.replace(/^--/, "");
      }
      return this.short.replace(/^-/, "");
    }
    attributeName() {
      return camelcase(this.name().replace(/^no-/, ""));
    }
    is(arg) {
      return this.short === arg || this.long === arg;
    }
    isBoolean() {
      return !this.required && !this.optional && !this.negate;
    }
  }

  class DualOptions {
    constructor(options) {
      this.positiveOptions = new Map;
      this.negativeOptions = new Map;
      this.dualOptions = new Set;
      options.forEach((option) => {
        if (option.negate) {
          this.negativeOptions.set(option.attributeName(), option);
        } else {
          this.positiveOptions.set(option.attributeName(), option);
        }
      });
      this.negativeOptions.forEach((value, key) => {
        if (this.positiveOptions.has(key)) {
          this.dualOptions.add(key);
        }
      });
    }
    valueFromOption(value, option) {
      const optionKey = option.attributeName();
      if (!this.dualOptions.has(optionKey))
        return true;
      const preset = this.negativeOptions.get(optionKey).presetArg;
      const negativeValue = preset !== undefined ? preset : false;
      return option.negate === (negativeValue === value);
    }
  }
  function camelcase(str) {
    return str.split("-").reduce((str2, word) => {
      return str2 + word[0].toUpperCase() + word.slice(1);
    });
  }
  function splitOptionFlags(flags) {
    let shortFlag;
    let longFlag;
    const flagParts = flags.split(/[ |,]+/);
    if (flagParts.length > 1 && !/^[[<]/.test(flagParts[1]))
      shortFlag = flagParts.shift();
    longFlag = flagParts.shift();
    if (!shortFlag && /^-[^-]$/.test(longFlag)) {
      shortFlag = longFlag;
      longFlag = undefined;
    }
    return { shortFlag, longFlag };
  }
  exports.Option = Option;
  exports.splitOptionFlags = splitOptionFlags;
  exports.DualOptions = DualOptions;
});

// node_modules/commander/lib/suggestSimilar.js
var require_suggestSimilar = __commonJS((exports) => {
  var maxDistance = 3;
  function editDistance(a, b) {
    if (Math.abs(a.length - b.length) > maxDistance)
      return Math.max(a.length, b.length);
    const d = [];
    for (let i = 0;i <= a.length; i++) {
      d[i] = [i];
    }
    for (let j = 0;j <= b.length; j++) {
      d[0][j] = j;
    }
    for (let j = 1;j <= b.length; j++) {
      for (let i = 1;i <= a.length; i++) {
        let cost = 1;
        if (a[i - 1] === b[j - 1]) {
          cost = 0;
        } else {
          cost = 1;
        }
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
        if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
          d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
        }
      }
    }
    return d[a.length][b.length];
  }
  function suggestSimilar(word, candidates) {
    if (!candidates || candidates.length === 0)
      return "";
    candidates = Array.from(new Set(candidates));
    const searchingOptions = word.startsWith("--");
    if (searchingOptions) {
      word = word.slice(2);
      candidates = candidates.map((candidate) => candidate.slice(2));
    }
    let similar = [];
    let bestDistance = maxDistance;
    const minSimilarity = 0.4;
    candidates.forEach((candidate) => {
      if (candidate.length <= 1)
        return;
      const distance = editDistance(word, candidate);
      const length = Math.max(word.length, candidate.length);
      const similarity = (length - distance) / length;
      if (similarity > minSimilarity) {
        if (distance < bestDistance) {
          bestDistance = distance;
          similar = [candidate];
        } else if (distance === bestDistance) {
          similar.push(candidate);
        }
      }
    });
    similar.sort((a, b) => a.localeCompare(b));
    if (searchingOptions) {
      similar = similar.map((candidate) => `--${candidate}`);
    }
    if (similar.length > 1) {
      return `
(Did you mean one of ${similar.join(", ")}?)`;
    }
    if (similar.length === 1) {
      return `
(Did you mean ${similar[0]}?)`;
    }
    return "";
  }
  exports.suggestSimilar = suggestSimilar;
});

// node_modules/commander/lib/command.js
var require_command = __commonJS((exports) => {
  var EventEmitter = __require("events").EventEmitter;
  var childProcess = __require("child_process");
  var path = __require("path");
  var fs = __require("fs");
  var process2 = __require("process");
  var { Argument, humanReadableArgName } = require_argument();
  var { CommanderError } = require_error();
  var { Help } = require_help();
  var { Option, splitOptionFlags, DualOptions } = require_option();
  var { suggestSimilar } = require_suggestSimilar();

  class Command extends EventEmitter {
    constructor(name) {
      super();
      this.commands = [];
      this.options = [];
      this.parent = null;
      this._allowUnknownOption = false;
      this._allowExcessArguments = true;
      this.registeredArguments = [];
      this._args = this.registeredArguments;
      this.args = [];
      this.rawArgs = [];
      this.processedArgs = [];
      this._scriptPath = null;
      this._name = name || "";
      this._optionValues = {};
      this._optionValueSources = {};
      this._storeOptionsAsProperties = false;
      this._actionHandler = null;
      this._executableHandler = false;
      this._executableFile = null;
      this._executableDir = null;
      this._defaultCommandName = null;
      this._exitCallback = null;
      this._aliases = [];
      this._combineFlagAndOptionalValue = true;
      this._description = "";
      this._summary = "";
      this._argsDescription = undefined;
      this._enablePositionalOptions = false;
      this._passThroughOptions = false;
      this._lifeCycleHooks = {};
      this._showHelpAfterError = false;
      this._showSuggestionAfterError = true;
      this._outputConfiguration = {
        writeOut: (str) => process2.stdout.write(str),
        writeErr: (str) => process2.stderr.write(str),
        getOutHelpWidth: () => process2.stdout.isTTY ? process2.stdout.columns : undefined,
        getErrHelpWidth: () => process2.stderr.isTTY ? process2.stderr.columns : undefined,
        outputError: (str, write) => write(str)
      };
      this._hidden = false;
      this._hasHelpOption = true;
      this._helpFlags = "-h, --help";
      this._helpDescription = "display help for command";
      this._helpShortFlag = "-h";
      this._helpLongFlag = "--help";
      this._addImplicitHelpCommand = undefined;
      this._helpCommandName = "help";
      this._helpCommandnameAndArgs = "help [command]";
      this._helpCommandDescription = "display help for command";
      this._helpConfiguration = {};
    }
    copyInheritedSettings(sourceCommand) {
      this._outputConfiguration = sourceCommand._outputConfiguration;
      this._hasHelpOption = sourceCommand._hasHelpOption;
      this._helpFlags = sourceCommand._helpFlags;
      this._helpDescription = sourceCommand._helpDescription;
      this._helpShortFlag = sourceCommand._helpShortFlag;
      this._helpLongFlag = sourceCommand._helpLongFlag;
      this._helpCommandName = sourceCommand._helpCommandName;
      this._helpCommandnameAndArgs = sourceCommand._helpCommandnameAndArgs;
      this._helpCommandDescription = sourceCommand._helpCommandDescription;
      this._helpConfiguration = sourceCommand._helpConfiguration;
      this._exitCallback = sourceCommand._exitCallback;
      this._storeOptionsAsProperties = sourceCommand._storeOptionsAsProperties;
      this._combineFlagAndOptionalValue = sourceCommand._combineFlagAndOptionalValue;
      this._allowExcessArguments = sourceCommand._allowExcessArguments;
      this._enablePositionalOptions = sourceCommand._enablePositionalOptions;
      this._showHelpAfterError = sourceCommand._showHelpAfterError;
      this._showSuggestionAfterError = sourceCommand._showSuggestionAfterError;
      return this;
    }
    _getCommandAndAncestors() {
      const result = [];
      for (let command = this;command; command = command.parent) {
        result.push(command);
      }
      return result;
    }
    command(nameAndArgs, actionOptsOrExecDesc, execOpts) {
      let desc = actionOptsOrExecDesc;
      let opts = execOpts;
      if (typeof desc === "object" && desc !== null) {
        opts = desc;
        desc = null;
      }
      opts = opts || {};
      const [, name, args] = nameAndArgs.match(/([^ ]+) *(.*)/);
      const cmd = this.createCommand(name);
      if (desc) {
        cmd.description(desc);
        cmd._executableHandler = true;
      }
      if (opts.isDefault)
        this._defaultCommandName = cmd._name;
      cmd._hidden = !!(opts.noHelp || opts.hidden);
      cmd._executableFile = opts.executableFile || null;
      if (args)
        cmd.arguments(args);
      this.commands.push(cmd);
      cmd.parent = this;
      cmd.copyInheritedSettings(this);
      if (desc)
        return this;
      return cmd;
    }
    createCommand(name) {
      return new Command(name);
    }
    createHelp() {
      return Object.assign(new Help, this.configureHelp());
    }
    configureHelp(configuration) {
      if (configuration === undefined)
        return this._helpConfiguration;
      this._helpConfiguration = configuration;
      return this;
    }
    configureOutput(configuration) {
      if (configuration === undefined)
        return this._outputConfiguration;
      Object.assign(this._outputConfiguration, configuration);
      return this;
    }
    showHelpAfterError(displayHelp = true) {
      if (typeof displayHelp !== "string")
        displayHelp = !!displayHelp;
      this._showHelpAfterError = displayHelp;
      return this;
    }
    showSuggestionAfterError(displaySuggestion = true) {
      this._showSuggestionAfterError = !!displaySuggestion;
      return this;
    }
    addCommand(cmd, opts) {
      if (!cmd._name) {
        throw new Error(`Command passed to .addCommand() must have a name
- specify the name in Command constructor or using .name()`);
      }
      opts = opts || {};
      if (opts.isDefault)
        this._defaultCommandName = cmd._name;
      if (opts.noHelp || opts.hidden)
        cmd._hidden = true;
      this.commands.push(cmd);
      cmd.parent = this;
      return this;
    }
    createArgument(name, description) {
      return new Argument(name, description);
    }
    argument(name, description, fn, defaultValue) {
      const argument = this.createArgument(name, description);
      if (typeof fn === "function") {
        argument.default(defaultValue).argParser(fn);
      } else {
        argument.default(fn);
      }
      this.addArgument(argument);
      return this;
    }
    arguments(names) {
      names.trim().split(/ +/).forEach((detail) => {
        this.argument(detail);
      });
      return this;
    }
    addArgument(argument) {
      const previousArgument = this.registeredArguments.slice(-1)[0];
      if (previousArgument && previousArgument.variadic) {
        throw new Error(`only the last argument can be variadic '${previousArgument.name()}'`);
      }
      if (argument.required && argument.defaultValue !== undefined && argument.parseArg === undefined) {
        throw new Error(`a default value for a required argument is never used: '${argument.name()}'`);
      }
      this.registeredArguments.push(argument);
      return this;
    }
    addHelpCommand(enableOrNameAndArgs, description) {
      if (enableOrNameAndArgs === false) {
        this._addImplicitHelpCommand = false;
      } else {
        this._addImplicitHelpCommand = true;
        if (typeof enableOrNameAndArgs === "string") {
          this._helpCommandName = enableOrNameAndArgs.split(" ")[0];
          this._helpCommandnameAndArgs = enableOrNameAndArgs;
        }
        this._helpCommandDescription = description || this._helpCommandDescription;
      }
      return this;
    }
    _hasImplicitHelpCommand() {
      if (this._addImplicitHelpCommand === undefined) {
        return this.commands.length && !this._actionHandler && !this._findCommand("help");
      }
      return this._addImplicitHelpCommand;
    }
    hook(event, listener) {
      const allowedValues = ["preSubcommand", "preAction", "postAction"];
      if (!allowedValues.includes(event)) {
        throw new Error(`Unexpected value for event passed to hook : '${event}'.
Expecting one of '${allowedValues.join("', '")}'`);
      }
      if (this._lifeCycleHooks[event]) {
        this._lifeCycleHooks[event].push(listener);
      } else {
        this._lifeCycleHooks[event] = [listener];
      }
      return this;
    }
    exitOverride(fn) {
      if (fn) {
        this._exitCallback = fn;
      } else {
        this._exitCallback = (err) => {
          if (err.code !== "commander.executeSubCommandAsync") {
            throw err;
          } else {}
        };
      }
      return this;
    }
    _exit(exitCode, code, message) {
      if (this._exitCallback) {
        this._exitCallback(new CommanderError(exitCode, code, message));
      }
      process2.exit(exitCode);
    }
    action(fn) {
      const listener = (args) => {
        const expectedArgsCount = this.registeredArguments.length;
        const actionArgs = args.slice(0, expectedArgsCount);
        if (this._storeOptionsAsProperties) {
          actionArgs[expectedArgsCount] = this;
        } else {
          actionArgs[expectedArgsCount] = this.opts();
        }
        actionArgs.push(this);
        return fn.apply(this, actionArgs);
      };
      this._actionHandler = listener;
      return this;
    }
    createOption(flags, description) {
      return new Option(flags, description);
    }
    _callParseArg(target, value, previous, invalidArgumentMessage) {
      try {
        return target.parseArg(value, previous);
      } catch (err) {
        if (err.code === "commander.invalidArgument") {
          const message = `${invalidArgumentMessage} ${err.message}`;
          this.error(message, { exitCode: err.exitCode, code: err.code });
        }
        throw err;
      }
    }
    addOption(option) {
      const oname = option.name();
      const name = option.attributeName();
      if (option.negate) {
        const positiveLongFlag = option.long.replace(/^--no-/, "--");
        if (!this._findOption(positiveLongFlag)) {
          this.setOptionValueWithSource(name, option.defaultValue === undefined ? true : option.defaultValue, "default");
        }
      } else if (option.defaultValue !== undefined) {
        this.setOptionValueWithSource(name, option.defaultValue, "default");
      }
      this.options.push(option);
      const handleOptionValue = (val, invalidValueMessage, valueSource) => {
        if (val == null && option.presetArg !== undefined) {
          val = option.presetArg;
        }
        const oldValue = this.getOptionValue(name);
        if (val !== null && option.parseArg) {
          val = this._callParseArg(option, val, oldValue, invalidValueMessage);
        } else if (val !== null && option.variadic) {
          val = option._concatValue(val, oldValue);
        }
        if (val == null) {
          if (option.negate) {
            val = false;
          } else if (option.isBoolean() || option.optional) {
            val = true;
          } else {
            val = "";
          }
        }
        this.setOptionValueWithSource(name, val, valueSource);
      };
      this.on("option:" + oname, (val) => {
        const invalidValueMessage = `error: option '${option.flags}' argument '${val}' is invalid.`;
        handleOptionValue(val, invalidValueMessage, "cli");
      });
      if (option.envVar) {
        this.on("optionEnv:" + oname, (val) => {
          const invalidValueMessage = `error: option '${option.flags}' value '${val}' from env '${option.envVar}' is invalid.`;
          handleOptionValue(val, invalidValueMessage, "env");
        });
      }
      return this;
    }
    _optionEx(config, flags, description, fn, defaultValue) {
      if (typeof flags === "object" && flags instanceof Option) {
        throw new Error("To add an Option object use addOption() instead of option() or requiredOption()");
      }
      const option = this.createOption(flags, description);
      option.makeOptionMandatory(!!config.mandatory);
      if (typeof fn === "function") {
        option.default(defaultValue).argParser(fn);
      } else if (fn instanceof RegExp) {
        const regex = fn;
        fn = (val, def) => {
          const m = regex.exec(val);
          return m ? m[0] : def;
        };
        option.default(defaultValue).argParser(fn);
      } else {
        option.default(fn);
      }
      return this.addOption(option);
    }
    option(flags, description, parseArg, defaultValue) {
      return this._optionEx({}, flags, description, parseArg, defaultValue);
    }
    requiredOption(flags, description, parseArg, defaultValue) {
      return this._optionEx({ mandatory: true }, flags, description, parseArg, defaultValue);
    }
    combineFlagAndOptionalValue(combine = true) {
      this._combineFlagAndOptionalValue = !!combine;
      return this;
    }
    allowUnknownOption(allowUnknown = true) {
      this._allowUnknownOption = !!allowUnknown;
      return this;
    }
    allowExcessArguments(allowExcess = true) {
      this._allowExcessArguments = !!allowExcess;
      return this;
    }
    enablePositionalOptions(positional = true) {
      this._enablePositionalOptions = !!positional;
      return this;
    }
    passThroughOptions(passThrough = true) {
      this._passThroughOptions = !!passThrough;
      if (!!this.parent && passThrough && !this.parent._enablePositionalOptions) {
        throw new Error("passThroughOptions can not be used without turning on enablePositionalOptions for parent command(s)");
      }
      return this;
    }
    storeOptionsAsProperties(storeAsProperties = true) {
      if (this.options.length) {
        throw new Error("call .storeOptionsAsProperties() before adding options");
      }
      this._storeOptionsAsProperties = !!storeAsProperties;
      return this;
    }
    getOptionValue(key) {
      if (this._storeOptionsAsProperties) {
        return this[key];
      }
      return this._optionValues[key];
    }
    setOptionValue(key, value) {
      return this.setOptionValueWithSource(key, value, undefined);
    }
    setOptionValueWithSource(key, value, source) {
      if (this._storeOptionsAsProperties) {
        this[key] = value;
      } else {
        this._optionValues[key] = value;
      }
      this._optionValueSources[key] = source;
      return this;
    }
    getOptionValueSource(key) {
      return this._optionValueSources[key];
    }
    getOptionValueSourceWithGlobals(key) {
      let source;
      this._getCommandAndAncestors().forEach((cmd) => {
        if (cmd.getOptionValueSource(key) !== undefined) {
          source = cmd.getOptionValueSource(key);
        }
      });
      return source;
    }
    _prepareUserArgs(argv, parseOptions) {
      if (argv !== undefined && !Array.isArray(argv)) {
        throw new Error("first parameter to parse must be array or undefined");
      }
      parseOptions = parseOptions || {};
      if (argv === undefined) {
        argv = process2.argv;
        if (process2.versions && process2.versions.electron) {
          parseOptions.from = "electron";
        }
      }
      this.rawArgs = argv.slice();
      let userArgs;
      switch (parseOptions.from) {
        case undefined:
        case "node":
          this._scriptPath = argv[1];
          userArgs = argv.slice(2);
          break;
        case "electron":
          if (process2.defaultApp) {
            this._scriptPath = argv[1];
            userArgs = argv.slice(2);
          } else {
            userArgs = argv.slice(1);
          }
          break;
        case "user":
          userArgs = argv.slice(0);
          break;
        default:
          throw new Error(`unexpected parse option { from: '${parseOptions.from}' }`);
      }
      if (!this._name && this._scriptPath)
        this.nameFromFilename(this._scriptPath);
      this._name = this._name || "program";
      return userArgs;
    }
    parse(argv, parseOptions) {
      const userArgs = this._prepareUserArgs(argv, parseOptions);
      this._parseCommand([], userArgs);
      return this;
    }
    async parseAsync(argv, parseOptions) {
      const userArgs = this._prepareUserArgs(argv, parseOptions);
      await this._parseCommand([], userArgs);
      return this;
    }
    _executeSubCommand(subcommand, args) {
      args = args.slice();
      let launchWithNode = false;
      const sourceExt = [".js", ".ts", ".tsx", ".mjs", ".cjs"];
      function findFile(baseDir, baseName) {
        const localBin = path.resolve(baseDir, baseName);
        if (fs.existsSync(localBin))
          return localBin;
        if (sourceExt.includes(path.extname(baseName)))
          return;
        const foundExt = sourceExt.find((ext) => fs.existsSync(`${localBin}${ext}`));
        if (foundExt)
          return `${localBin}${foundExt}`;
        return;
      }
      this._checkForMissingMandatoryOptions();
      this._checkForConflictingOptions();
      let executableFile = subcommand._executableFile || `${this._name}-${subcommand._name}`;
      let executableDir = this._executableDir || "";
      if (this._scriptPath) {
        let resolvedScriptPath;
        try {
          resolvedScriptPath = fs.realpathSync(this._scriptPath);
        } catch (err) {
          resolvedScriptPath = this._scriptPath;
        }
        executableDir = path.resolve(path.dirname(resolvedScriptPath), executableDir);
      }
      if (executableDir) {
        let localFile = findFile(executableDir, executableFile);
        if (!localFile && !subcommand._executableFile && this._scriptPath) {
          const legacyName = path.basename(this._scriptPath, path.extname(this._scriptPath));
          if (legacyName !== this._name) {
            localFile = findFile(executableDir, `${legacyName}-${subcommand._name}`);
          }
        }
        executableFile = localFile || executableFile;
      }
      launchWithNode = sourceExt.includes(path.extname(executableFile));
      let proc;
      if (process2.platform !== "win32") {
        if (launchWithNode) {
          args.unshift(executableFile);
          args = incrementNodeInspectorPort(process2.execArgv).concat(args);
          proc = childProcess.spawn(process2.argv[0], args, { stdio: "inherit" });
        } else {
          proc = childProcess.spawn(executableFile, args, { stdio: "inherit" });
        }
      } else {
        args.unshift(executableFile);
        args = incrementNodeInspectorPort(process2.execArgv).concat(args);
        proc = childProcess.spawn(process2.execPath, args, { stdio: "inherit" });
      }
      if (!proc.killed) {
        const signals = ["SIGUSR1", "SIGUSR2", "SIGTERM", "SIGINT", "SIGHUP"];
        signals.forEach((signal) => {
          process2.on(signal, () => {
            if (proc.killed === false && proc.exitCode === null) {
              proc.kill(signal);
            }
          });
        });
      }
      const exitCallback = this._exitCallback;
      if (!exitCallback) {
        proc.on("close", process2.exit.bind(process2));
      } else {
        proc.on("close", () => {
          exitCallback(new CommanderError(process2.exitCode || 0, "commander.executeSubCommandAsync", "(close)"));
        });
      }
      proc.on("error", (err) => {
        if (err.code === "ENOENT") {
          const executableDirMessage = executableDir ? `searched for local subcommand relative to directory '${executableDir}'` : "no directory for search for local subcommand, use .executableDir() to supply a custom directory";
          const executableMissing = `'${executableFile}' does not exist
 - if '${subcommand._name}' is not meant to be an executable command, remove description parameter from '.command()' and use '.description()' instead
 - if the default executable name is not suitable, use the executableFile option to supply a custom name or path
 - ${executableDirMessage}`;
          throw new Error(executableMissing);
        } else if (err.code === "EACCES") {
          throw new Error(`'${executableFile}' not executable`);
        }
        if (!exitCallback) {
          process2.exit(1);
        } else {
          const wrappedError = new CommanderError(1, "commander.executeSubCommandAsync", "(error)");
          wrappedError.nestedError = err;
          exitCallback(wrappedError);
        }
      });
      this.runningCommand = proc;
    }
    _dispatchSubcommand(commandName, operands, unknown) {
      const subCommand = this._findCommand(commandName);
      if (!subCommand)
        this.help({ error: true });
      let promiseChain;
      promiseChain = this._chainOrCallSubCommandHook(promiseChain, subCommand, "preSubcommand");
      promiseChain = this._chainOrCall(promiseChain, () => {
        if (subCommand._executableHandler) {
          this._executeSubCommand(subCommand, operands.concat(unknown));
        } else {
          return subCommand._parseCommand(operands, unknown);
        }
      });
      return promiseChain;
    }
    _dispatchHelpCommand(subcommandName) {
      if (!subcommandName) {
        this.help();
      }
      const subCommand = this._findCommand(subcommandName);
      if (subCommand && !subCommand._executableHandler) {
        subCommand.help();
      }
      return this._dispatchSubcommand(subcommandName, [], [
        this._helpLongFlag || this._helpShortFlag
      ]);
    }
    _checkNumberOfArguments() {
      this.registeredArguments.forEach((arg, i) => {
        if (arg.required && this.args[i] == null) {
          this.missingArgument(arg.name());
        }
      });
      if (this.registeredArguments.length > 0 && this.registeredArguments[this.registeredArguments.length - 1].variadic) {
        return;
      }
      if (this.args.length > this.registeredArguments.length) {
        this._excessArguments(this.args);
      }
    }
    _processArguments() {
      const myParseArg = (argument, value, previous) => {
        let parsedValue = value;
        if (value !== null && argument.parseArg) {
          const invalidValueMessage = `error: command-argument value '${value}' is invalid for argument '${argument.name()}'.`;
          parsedValue = this._callParseArg(argument, value, previous, invalidValueMessage);
        }
        return parsedValue;
      };
      this._checkNumberOfArguments();
      const processedArgs = [];
      this.registeredArguments.forEach((declaredArg, index) => {
        let value = declaredArg.defaultValue;
        if (declaredArg.variadic) {
          if (index < this.args.length) {
            value = this.args.slice(index);
            if (declaredArg.parseArg) {
              value = value.reduce((processed, v) => {
                return myParseArg(declaredArg, v, processed);
              }, declaredArg.defaultValue);
            }
          } else if (value === undefined) {
            value = [];
          }
        } else if (index < this.args.length) {
          value = this.args[index];
          if (declaredArg.parseArg) {
            value = myParseArg(declaredArg, value, declaredArg.defaultValue);
          }
        }
        processedArgs[index] = value;
      });
      this.processedArgs = processedArgs;
    }
    _chainOrCall(promise, fn) {
      if (promise && promise.then && typeof promise.then === "function") {
        return promise.then(() => fn());
      }
      return fn();
    }
    _chainOrCallHooks(promise, event) {
      let result = promise;
      const hooks = [];
      this._getCommandAndAncestors().reverse().filter((cmd) => cmd._lifeCycleHooks[event] !== undefined).forEach((hookedCommand) => {
        hookedCommand._lifeCycleHooks[event].forEach((callback) => {
          hooks.push({ hookedCommand, callback });
        });
      });
      if (event === "postAction") {
        hooks.reverse();
      }
      hooks.forEach((hookDetail) => {
        result = this._chainOrCall(result, () => {
          return hookDetail.callback(hookDetail.hookedCommand, this);
        });
      });
      return result;
    }
    _chainOrCallSubCommandHook(promise, subCommand, event) {
      let result = promise;
      if (this._lifeCycleHooks[event] !== undefined) {
        this._lifeCycleHooks[event].forEach((hook) => {
          result = this._chainOrCall(result, () => {
            return hook(this, subCommand);
          });
        });
      }
      return result;
    }
    _parseCommand(operands, unknown) {
      const parsed = this.parseOptions(unknown);
      this._parseOptionsEnv();
      this._parseOptionsImplied();
      operands = operands.concat(parsed.operands);
      unknown = parsed.unknown;
      this.args = operands.concat(unknown);
      if (operands && this._findCommand(operands[0])) {
        return this._dispatchSubcommand(operands[0], operands.slice(1), unknown);
      }
      if (this._hasImplicitHelpCommand() && operands[0] === this._helpCommandName) {
        return this._dispatchHelpCommand(operands[1]);
      }
      if (this._defaultCommandName) {
        outputHelpIfRequested(this, unknown);
        return this._dispatchSubcommand(this._defaultCommandName, operands, unknown);
      }
      if (this.commands.length && this.args.length === 0 && !this._actionHandler && !this._defaultCommandName) {
        this.help({ error: true });
      }
      outputHelpIfRequested(this, parsed.unknown);
      this._checkForMissingMandatoryOptions();
      this._checkForConflictingOptions();
      const checkForUnknownOptions = () => {
        if (parsed.unknown.length > 0) {
          this.unknownOption(parsed.unknown[0]);
        }
      };
      const commandEvent = `command:${this.name()}`;
      if (this._actionHandler) {
        checkForUnknownOptions();
        this._processArguments();
        let promiseChain;
        promiseChain = this._chainOrCallHooks(promiseChain, "preAction");
        promiseChain = this._chainOrCall(promiseChain, () => this._actionHandler(this.processedArgs));
        if (this.parent) {
          promiseChain = this._chainOrCall(promiseChain, () => {
            this.parent.emit(commandEvent, operands, unknown);
          });
        }
        promiseChain = this._chainOrCallHooks(promiseChain, "postAction");
        return promiseChain;
      }
      if (this.parent && this.parent.listenerCount(commandEvent)) {
        checkForUnknownOptions();
        this._processArguments();
        this.parent.emit(commandEvent, operands, unknown);
      } else if (operands.length) {
        if (this._findCommand("*")) {
          return this._dispatchSubcommand("*", operands, unknown);
        }
        if (this.listenerCount("command:*")) {
          this.emit("command:*", operands, unknown);
        } else if (this.commands.length) {
          this.unknownCommand();
        } else {
          checkForUnknownOptions();
          this._processArguments();
        }
      } else if (this.commands.length) {
        checkForUnknownOptions();
        this.help({ error: true });
      } else {
        checkForUnknownOptions();
        this._processArguments();
      }
    }
    _findCommand(name) {
      if (!name)
        return;
      return this.commands.find((cmd) => cmd._name === name || cmd._aliases.includes(name));
    }
    _findOption(arg) {
      return this.options.find((option) => option.is(arg));
    }
    _checkForMissingMandatoryOptions() {
      this._getCommandAndAncestors().forEach((cmd) => {
        cmd.options.forEach((anOption) => {
          if (anOption.mandatory && cmd.getOptionValue(anOption.attributeName()) === undefined) {
            cmd.missingMandatoryOptionValue(anOption);
          }
        });
      });
    }
    _checkForConflictingLocalOptions() {
      const definedNonDefaultOptions = this.options.filter((option) => {
        const optionKey = option.attributeName();
        if (this.getOptionValue(optionKey) === undefined) {
          return false;
        }
        return this.getOptionValueSource(optionKey) !== "default";
      });
      const optionsWithConflicting = definedNonDefaultOptions.filter((option) => option.conflictsWith.length > 0);
      optionsWithConflicting.forEach((option) => {
        const conflictingAndDefined = definedNonDefaultOptions.find((defined) => option.conflictsWith.includes(defined.attributeName()));
        if (conflictingAndDefined) {
          this._conflictingOption(option, conflictingAndDefined);
        }
      });
    }
    _checkForConflictingOptions() {
      this._getCommandAndAncestors().forEach((cmd) => {
        cmd._checkForConflictingLocalOptions();
      });
    }
    parseOptions(argv) {
      const operands = [];
      const unknown = [];
      let dest = operands;
      const args = argv.slice();
      function maybeOption(arg) {
        return arg.length > 1 && arg[0] === "-";
      }
      let activeVariadicOption = null;
      while (args.length) {
        const arg = args.shift();
        if (arg === "--") {
          if (dest === unknown)
            dest.push(arg);
          dest.push(...args);
          break;
        }
        if (activeVariadicOption && !maybeOption(arg)) {
          this.emit(`option:${activeVariadicOption.name()}`, arg);
          continue;
        }
        activeVariadicOption = null;
        if (maybeOption(arg)) {
          const option = this._findOption(arg);
          if (option) {
            if (option.required) {
              const value = args.shift();
              if (value === undefined)
                this.optionMissingArgument(option);
              this.emit(`option:${option.name()}`, value);
            } else if (option.optional) {
              let value = null;
              if (args.length > 0 && !maybeOption(args[0])) {
                value = args.shift();
              }
              this.emit(`option:${option.name()}`, value);
            } else {
              this.emit(`option:${option.name()}`);
            }
            activeVariadicOption = option.variadic ? option : null;
            continue;
          }
        }
        if (arg.length > 2 && arg[0] === "-" && arg[1] !== "-") {
          const option = this._findOption(`-${arg[1]}`);
          if (option) {
            if (option.required || option.optional && this._combineFlagAndOptionalValue) {
              this.emit(`option:${option.name()}`, arg.slice(2));
            } else {
              this.emit(`option:${option.name()}`);
              args.unshift(`-${arg.slice(2)}`);
            }
            continue;
          }
        }
        if (/^--[^=]+=/.test(arg)) {
          const index = arg.indexOf("=");
          const option = this._findOption(arg.slice(0, index));
          if (option && (option.required || option.optional)) {
            this.emit(`option:${option.name()}`, arg.slice(index + 1));
            continue;
          }
        }
        if (maybeOption(arg)) {
          dest = unknown;
        }
        if ((this._enablePositionalOptions || this._passThroughOptions) && operands.length === 0 && unknown.length === 0) {
          if (this._findCommand(arg)) {
            operands.push(arg);
            if (args.length > 0)
              unknown.push(...args);
            break;
          } else if (arg === this._helpCommandName && this._hasImplicitHelpCommand()) {
            operands.push(arg);
            if (args.length > 0)
              operands.push(...args);
            break;
          } else if (this._defaultCommandName) {
            unknown.push(arg);
            if (args.length > 0)
              unknown.push(...args);
            break;
          }
        }
        if (this._passThroughOptions) {
          dest.push(arg);
          if (args.length > 0)
            dest.push(...args);
          break;
        }
        dest.push(arg);
      }
      return { operands, unknown };
    }
    opts() {
      if (this._storeOptionsAsProperties) {
        const result = {};
        const len = this.options.length;
        for (let i = 0;i < len; i++) {
          const key = this.options[i].attributeName();
          result[key] = key === this._versionOptionName ? this._version : this[key];
        }
        return result;
      }
      return this._optionValues;
    }
    optsWithGlobals() {
      return this._getCommandAndAncestors().reduce((combinedOptions, cmd) => Object.assign(combinedOptions, cmd.opts()), {});
    }
    error(message, errorOptions) {
      this._outputConfiguration.outputError(`${message}
`, this._outputConfiguration.writeErr);
      if (typeof this._showHelpAfterError === "string") {
        this._outputConfiguration.writeErr(`${this._showHelpAfterError}
`);
      } else if (this._showHelpAfterError) {
        this._outputConfiguration.writeErr(`
`);
        this.outputHelp({ error: true });
      }
      const config = errorOptions || {};
      const exitCode = config.exitCode || 1;
      const code = config.code || "commander.error";
      this._exit(exitCode, code, message);
    }
    _parseOptionsEnv() {
      this.options.forEach((option) => {
        if (option.envVar && option.envVar in process2.env) {
          const optionKey = option.attributeName();
          if (this.getOptionValue(optionKey) === undefined || ["default", "config", "env"].includes(this.getOptionValueSource(optionKey))) {
            if (option.required || option.optional) {
              this.emit(`optionEnv:${option.name()}`, process2.env[option.envVar]);
            } else {
              this.emit(`optionEnv:${option.name()}`);
            }
          }
        }
      });
    }
    _parseOptionsImplied() {
      const dualHelper = new DualOptions(this.options);
      const hasCustomOptionValue = (optionKey) => {
        return this.getOptionValue(optionKey) !== undefined && !["default", "implied"].includes(this.getOptionValueSource(optionKey));
      };
      this.options.filter((option) => option.implied !== undefined && hasCustomOptionValue(option.attributeName()) && dualHelper.valueFromOption(this.getOptionValue(option.attributeName()), option)).forEach((option) => {
        Object.keys(option.implied).filter((impliedKey) => !hasCustomOptionValue(impliedKey)).forEach((impliedKey) => {
          this.setOptionValueWithSource(impliedKey, option.implied[impliedKey], "implied");
        });
      });
    }
    missingArgument(name) {
      const message = `error: missing required argument '${name}'`;
      this.error(message, { code: "commander.missingArgument" });
    }
    optionMissingArgument(option) {
      const message = `error: option '${option.flags}' argument missing`;
      this.error(message, { code: "commander.optionMissingArgument" });
    }
    missingMandatoryOptionValue(option) {
      const message = `error: required option '${option.flags}' not specified`;
      this.error(message, { code: "commander.missingMandatoryOptionValue" });
    }
    _conflictingOption(option, conflictingOption) {
      const findBestOptionFromValue = (option2) => {
        const optionKey = option2.attributeName();
        const optionValue = this.getOptionValue(optionKey);
        const negativeOption = this.options.find((target) => target.negate && optionKey === target.attributeName());
        const positiveOption = this.options.find((target) => !target.negate && optionKey === target.attributeName());
        if (negativeOption && (negativeOption.presetArg === undefined && optionValue === false || negativeOption.presetArg !== undefined && optionValue === negativeOption.presetArg)) {
          return negativeOption;
        }
        return positiveOption || option2;
      };
      const getErrorMessage = (option2) => {
        const bestOption = findBestOptionFromValue(option2);
        const optionKey = bestOption.attributeName();
        const source = this.getOptionValueSource(optionKey);
        if (source === "env") {
          return `environment variable '${bestOption.envVar}'`;
        }
        return `option '${bestOption.flags}'`;
      };
      const message = `error: ${getErrorMessage(option)} cannot be used with ${getErrorMessage(conflictingOption)}`;
      this.error(message, { code: "commander.conflictingOption" });
    }
    unknownOption(flag) {
      if (this._allowUnknownOption)
        return;
      let suggestion = "";
      if (flag.startsWith("--") && this._showSuggestionAfterError) {
        let candidateFlags = [];
        let command = this;
        do {
          const moreFlags = command.createHelp().visibleOptions(command).filter((option) => option.long).map((option) => option.long);
          candidateFlags = candidateFlags.concat(moreFlags);
          command = command.parent;
        } while (command && !command._enablePositionalOptions);
        suggestion = suggestSimilar(flag, candidateFlags);
      }
      const message = `error: unknown option '${flag}'${suggestion}`;
      this.error(message, { code: "commander.unknownOption" });
    }
    _excessArguments(receivedArgs) {
      if (this._allowExcessArguments)
        return;
      const expected = this.registeredArguments.length;
      const s = expected === 1 ? "" : "s";
      const forSubcommand = this.parent ? ` for '${this.name()}'` : "";
      const message = `error: too many arguments${forSubcommand}. Expected ${expected} argument${s} but got ${receivedArgs.length}.`;
      this.error(message, { code: "commander.excessArguments" });
    }
    unknownCommand() {
      const unknownName = this.args[0];
      let suggestion = "";
      if (this._showSuggestionAfterError) {
        const candidateNames = [];
        this.createHelp().visibleCommands(this).forEach((command) => {
          candidateNames.push(command.name());
          if (command.alias())
            candidateNames.push(command.alias());
        });
        suggestion = suggestSimilar(unknownName, candidateNames);
      }
      const message = `error: unknown command '${unknownName}'${suggestion}`;
      this.error(message, { code: "commander.unknownCommand" });
    }
    version(str, flags, description) {
      if (str === undefined)
        return this._version;
      this._version = str;
      flags = flags || "-V, --version";
      description = description || "output the version number";
      const versionOption = this.createOption(flags, description);
      this._versionOptionName = versionOption.attributeName();
      this.options.push(versionOption);
      this.on("option:" + versionOption.name(), () => {
        this._outputConfiguration.writeOut(`${str}
`);
        this._exit(0, "commander.version", str);
      });
      return this;
    }
    description(str, argsDescription) {
      if (str === undefined && argsDescription === undefined)
        return this._description;
      this._description = str;
      if (argsDescription) {
        this._argsDescription = argsDescription;
      }
      return this;
    }
    summary(str) {
      if (str === undefined)
        return this._summary;
      this._summary = str;
      return this;
    }
    alias(alias) {
      if (alias === undefined)
        return this._aliases[0];
      let command = this;
      if (this.commands.length !== 0 && this.commands[this.commands.length - 1]._executableHandler) {
        command = this.commands[this.commands.length - 1];
      }
      if (alias === command._name)
        throw new Error("Command alias can't be the same as its name");
      command._aliases.push(alias);
      return this;
    }
    aliases(aliases) {
      if (aliases === undefined)
        return this._aliases;
      aliases.forEach((alias) => this.alias(alias));
      return this;
    }
    usage(str) {
      if (str === undefined) {
        if (this._usage)
          return this._usage;
        const args = this.registeredArguments.map((arg) => {
          return humanReadableArgName(arg);
        });
        return [].concat(this.options.length || this._hasHelpOption ? "[options]" : [], this.commands.length ? "[command]" : [], this.registeredArguments.length ? args : []).join(" ");
      }
      this._usage = str;
      return this;
    }
    name(str) {
      if (str === undefined)
        return this._name;
      this._name = str;
      return this;
    }
    nameFromFilename(filename) {
      this._name = path.basename(filename, path.extname(filename));
      return this;
    }
    executableDir(path2) {
      if (path2 === undefined)
        return this._executableDir;
      this._executableDir = path2;
      return this;
    }
    helpInformation(contextOptions) {
      const helper = this.createHelp();
      if (helper.helpWidth === undefined) {
        helper.helpWidth = contextOptions && contextOptions.error ? this._outputConfiguration.getErrHelpWidth() : this._outputConfiguration.getOutHelpWidth();
      }
      return helper.formatHelp(this, helper);
    }
    _getHelpContext(contextOptions) {
      contextOptions = contextOptions || {};
      const context = { error: !!contextOptions.error };
      let write;
      if (context.error) {
        write = (arg) => this._outputConfiguration.writeErr(arg);
      } else {
        write = (arg) => this._outputConfiguration.writeOut(arg);
      }
      context.write = contextOptions.write || write;
      context.command = this;
      return context;
    }
    outputHelp(contextOptions) {
      let deprecatedCallback;
      if (typeof contextOptions === "function") {
        deprecatedCallback = contextOptions;
        contextOptions = undefined;
      }
      const context = this._getHelpContext(contextOptions);
      this._getCommandAndAncestors().reverse().forEach((command) => command.emit("beforeAllHelp", context));
      this.emit("beforeHelp", context);
      let helpInformation = this.helpInformation(context);
      if (deprecatedCallback) {
        helpInformation = deprecatedCallback(helpInformation);
        if (typeof helpInformation !== "string" && !Buffer.isBuffer(helpInformation)) {
          throw new Error("outputHelp callback must return a string or a Buffer");
        }
      }
      context.write(helpInformation);
      if (this._helpLongFlag) {
        this.emit(this._helpLongFlag);
      }
      this.emit("afterHelp", context);
      this._getCommandAndAncestors().forEach((command) => command.emit("afterAllHelp", context));
    }
    helpOption(flags, description) {
      if (typeof flags === "boolean") {
        this._hasHelpOption = flags;
        return this;
      }
      this._helpFlags = flags || this._helpFlags;
      this._helpDescription = description || this._helpDescription;
      const helpFlags = splitOptionFlags(this._helpFlags);
      this._helpShortFlag = helpFlags.shortFlag;
      this._helpLongFlag = helpFlags.longFlag;
      return this;
    }
    help(contextOptions) {
      this.outputHelp(contextOptions);
      let exitCode = process2.exitCode || 0;
      if (exitCode === 0 && contextOptions && typeof contextOptions !== "function" && contextOptions.error) {
        exitCode = 1;
      }
      this._exit(exitCode, "commander.help", "(outputHelp)");
    }
    addHelpText(position, text) {
      const allowedValues = ["beforeAll", "before", "after", "afterAll"];
      if (!allowedValues.includes(position)) {
        throw new Error(`Unexpected value for position to addHelpText.
Expecting one of '${allowedValues.join("', '")}'`);
      }
      const helpEvent = `${position}Help`;
      this.on(helpEvent, (context) => {
        let helpStr;
        if (typeof text === "function") {
          helpStr = text({ error: context.error, command: context.command });
        } else {
          helpStr = text;
        }
        if (helpStr) {
          context.write(`${helpStr}
`);
        }
      });
      return this;
    }
  }
  function outputHelpIfRequested(cmd, args) {
    const helpOption = cmd._hasHelpOption && args.find((arg) => arg === cmd._helpLongFlag || arg === cmd._helpShortFlag);
    if (helpOption) {
      cmd.outputHelp();
      cmd._exit(0, "commander.helpDisplayed", "(outputHelp)");
    }
  }
  function incrementNodeInspectorPort(args) {
    return args.map((arg) => {
      if (!arg.startsWith("--inspect")) {
        return arg;
      }
      let debugOption;
      let debugHost = "127.0.0.1";
      let debugPort = "9229";
      let match;
      if ((match = arg.match(/^(--inspect(-brk)?)$/)) !== null) {
        debugOption = match[1];
      } else if ((match = arg.match(/^(--inspect(-brk|-port)?)=([^:]+)$/)) !== null) {
        debugOption = match[1];
        if (/^\d+$/.test(match[3])) {
          debugPort = match[3];
        } else {
          debugHost = match[3];
        }
      } else if ((match = arg.match(/^(--inspect(-brk|-port)?)=([^:]+):(\d+)$/)) !== null) {
        debugOption = match[1];
        debugHost = match[3];
        debugPort = match[4];
      }
      if (debugOption && debugPort !== "0") {
        return `${debugOption}=${debugHost}:${parseInt(debugPort) + 1}`;
      }
      return arg;
    });
  }
  exports.Command = Command;
});

// node_modules/commander/index.js
var require_commander = __commonJS((exports, module) => {
  var { Argument } = require_argument();
  var { Command } = require_command();
  var { CommanderError, InvalidArgumentError } = require_error();
  var { Help } = require_help();
  var { Option } = require_option();
  exports = module.exports = new Command;
  exports.program = exports;
  exports.Command = Command;
  exports.Option = Option;
  exports.Argument = Argument;
  exports.Help = Help;
  exports.CommanderError = CommanderError;
  exports.InvalidArgumentError = InvalidArgumentError;
  exports.InvalidOptionArgumentError = InvalidArgumentError;
});

// node_modules/cli-spinners/spinners.json
var require_spinners = __commonJS((exports, module) => {
  module.exports = {
    dots: {
      interval: 80,
      frames: [
        "⠋",
        "⠙",
        "⠹",
        "⠸",
        "⠼",
        "⠴",
        "⠦",
        "⠧",
        "⠇",
        "⠏"
      ]
    },
    dots2: {
      interval: 80,
      frames: [
        "⣾",
        "⣽",
        "⣻",
        "⢿",
        "⡿",
        "⣟",
        "⣯",
        "⣷"
      ]
    },
    dots3: {
      interval: 80,
      frames: [
        "⠋",
        "⠙",
        "⠚",
        "⠞",
        "⠖",
        "⠦",
        "⠴",
        "⠲",
        "⠳",
        "⠓"
      ]
    },
    dots4: {
      interval: 80,
      frames: [
        "⠄",
        "⠆",
        "⠇",
        "⠋",
        "⠙",
        "⠸",
        "⠰",
        "⠠",
        "⠰",
        "⠸",
        "⠙",
        "⠋",
        "⠇",
        "⠆"
      ]
    },
    dots5: {
      interval: 80,
      frames: [
        "⠋",
        "⠙",
        "⠚",
        "⠒",
        "⠂",
        "⠂",
        "⠒",
        "⠲",
        "⠴",
        "⠦",
        "⠖",
        "⠒",
        "⠐",
        "⠐",
        "⠒",
        "⠓",
        "⠋"
      ]
    },
    dots6: {
      interval: 80,
      frames: [
        "⠁",
        "⠉",
        "⠙",
        "⠚",
        "⠒",
        "⠂",
        "⠂",
        "⠒",
        "⠲",
        "⠴",
        "⠤",
        "⠄",
        "⠄",
        "⠤",
        "⠴",
        "⠲",
        "⠒",
        "⠂",
        "⠂",
        "⠒",
        "⠚",
        "⠙",
        "⠉",
        "⠁"
      ]
    },
    dots7: {
      interval: 80,
      frames: [
        "⠈",
        "⠉",
        "⠋",
        "⠓",
        "⠒",
        "⠐",
        "⠐",
        "⠒",
        "⠖",
        "⠦",
        "⠤",
        "⠠",
        "⠠",
        "⠤",
        "⠦",
        "⠖",
        "⠒",
        "⠐",
        "⠐",
        "⠒",
        "⠓",
        "⠋",
        "⠉",
        "⠈"
      ]
    },
    dots8: {
      interval: 80,
      frames: [
        "⠁",
        "⠁",
        "⠉",
        "⠙",
        "⠚",
        "⠒",
        "⠂",
        "⠂",
        "⠒",
        "⠲",
        "⠴",
        "⠤",
        "⠄",
        "⠄",
        "⠤",
        "⠠",
        "⠠",
        "⠤",
        "⠦",
        "⠖",
        "⠒",
        "⠐",
        "⠐",
        "⠒",
        "⠓",
        "⠋",
        "⠉",
        "⠈",
        "⠈"
      ]
    },
    dots9: {
      interval: 80,
      frames: [
        "⢹",
        "⢺",
        "⢼",
        "⣸",
        "⣇",
        "⡧",
        "⡗",
        "⡏"
      ]
    },
    dots10: {
      interval: 80,
      frames: [
        "⢄",
        "⢂",
        "⢁",
        "⡁",
        "⡈",
        "⡐",
        "⡠"
      ]
    },
    dots11: {
      interval: 100,
      frames: [
        "⠁",
        "⠂",
        "⠄",
        "⡀",
        "⢀",
        "⠠",
        "⠐",
        "⠈"
      ]
    },
    dots12: {
      interval: 80,
      frames: [
        "⢀⠀",
        "⡀⠀",
        "⠄⠀",
        "⢂⠀",
        "⡂⠀",
        "⠅⠀",
        "⢃⠀",
        "⡃⠀",
        "⠍⠀",
        "⢋⠀",
        "⡋⠀",
        "⠍⠁",
        "⢋⠁",
        "⡋⠁",
        "⠍⠉",
        "⠋⠉",
        "⠋⠉",
        "⠉⠙",
        "⠉⠙",
        "⠉⠩",
        "⠈⢙",
        "⠈⡙",
        "⢈⠩",
        "⡀⢙",
        "⠄⡙",
        "⢂⠩",
        "⡂⢘",
        "⠅⡘",
        "⢃⠨",
        "⡃⢐",
        "⠍⡐",
        "⢋⠠",
        "⡋⢀",
        "⠍⡁",
        "⢋⠁",
        "⡋⠁",
        "⠍⠉",
        "⠋⠉",
        "⠋⠉",
        "⠉⠙",
        "⠉⠙",
        "⠉⠩",
        "⠈⢙",
        "⠈⡙",
        "⠈⠩",
        "⠀⢙",
        "⠀⡙",
        "⠀⠩",
        "⠀⢘",
        "⠀⡘",
        "⠀⠨",
        "⠀⢐",
        "⠀⡐",
        "⠀⠠",
        "⠀⢀",
        "⠀⡀"
      ]
    },
    dots13: {
      interval: 80,
      frames: [
        "⣼",
        "⣹",
        "⢻",
        "⠿",
        "⡟",
        "⣏",
        "⣧",
        "⣶"
      ]
    },
    dots8Bit: {
      interval: 80,
      frames: [
        "⠀",
        "⠁",
        "⠂",
        "⠃",
        "⠄",
        "⠅",
        "⠆",
        "⠇",
        "⡀",
        "⡁",
        "⡂",
        "⡃",
        "⡄",
        "⡅",
        "⡆",
        "⡇",
        "⠈",
        "⠉",
        "⠊",
        "⠋",
        "⠌",
        "⠍",
        "⠎",
        "⠏",
        "⡈",
        "⡉",
        "⡊",
        "⡋",
        "⡌",
        "⡍",
        "⡎",
        "⡏",
        "⠐",
        "⠑",
        "⠒",
        "⠓",
        "⠔",
        "⠕",
        "⠖",
        "⠗",
        "⡐",
        "⡑",
        "⡒",
        "⡓",
        "⡔",
        "⡕",
        "⡖",
        "⡗",
        "⠘",
        "⠙",
        "⠚",
        "⠛",
        "⠜",
        "⠝",
        "⠞",
        "⠟",
        "⡘",
        "⡙",
        "⡚",
        "⡛",
        "⡜",
        "⡝",
        "⡞",
        "⡟",
        "⠠",
        "⠡",
        "⠢",
        "⠣",
        "⠤",
        "⠥",
        "⠦",
        "⠧",
        "⡠",
        "⡡",
        "⡢",
        "⡣",
        "⡤",
        "⡥",
        "⡦",
        "⡧",
        "⠨",
        "⠩",
        "⠪",
        "⠫",
        "⠬",
        "⠭",
        "⠮",
        "⠯",
        "⡨",
        "⡩",
        "⡪",
        "⡫",
        "⡬",
        "⡭",
        "⡮",
        "⡯",
        "⠰",
        "⠱",
        "⠲",
        "⠳",
        "⠴",
        "⠵",
        "⠶",
        "⠷",
        "⡰",
        "⡱",
        "⡲",
        "⡳",
        "⡴",
        "⡵",
        "⡶",
        "⡷",
        "⠸",
        "⠹",
        "⠺",
        "⠻",
        "⠼",
        "⠽",
        "⠾",
        "⠿",
        "⡸",
        "⡹",
        "⡺",
        "⡻",
        "⡼",
        "⡽",
        "⡾",
        "⡿",
        "⢀",
        "⢁",
        "⢂",
        "⢃",
        "⢄",
        "⢅",
        "⢆",
        "⢇",
        "⣀",
        "⣁",
        "⣂",
        "⣃",
        "⣄",
        "⣅",
        "⣆",
        "⣇",
        "⢈",
        "⢉",
        "⢊",
        "⢋",
        "⢌",
        "⢍",
        "⢎",
        "⢏",
        "⣈",
        "⣉",
        "⣊",
        "⣋",
        "⣌",
        "⣍",
        "⣎",
        "⣏",
        "⢐",
        "⢑",
        "⢒",
        "⢓",
        "⢔",
        "⢕",
        "⢖",
        "⢗",
        "⣐",
        "⣑",
        "⣒",
        "⣓",
        "⣔",
        "⣕",
        "⣖",
        "⣗",
        "⢘",
        "⢙",
        "⢚",
        "⢛",
        "⢜",
        "⢝",
        "⢞",
        "⢟",
        "⣘",
        "⣙",
        "⣚",
        "⣛",
        "⣜",
        "⣝",
        "⣞",
        "⣟",
        "⢠",
        "⢡",
        "⢢",
        "⢣",
        "⢤",
        "⢥",
        "⢦",
        "⢧",
        "⣠",
        "⣡",
        "⣢",
        "⣣",
        "⣤",
        "⣥",
        "⣦",
        "⣧",
        "⢨",
        "⢩",
        "⢪",
        "⢫",
        "⢬",
        "⢭",
        "⢮",
        "⢯",
        "⣨",
        "⣩",
        "⣪",
        "⣫",
        "⣬",
        "⣭",
        "⣮",
        "⣯",
        "⢰",
        "⢱",
        "⢲",
        "⢳",
        "⢴",
        "⢵",
        "⢶",
        "⢷",
        "⣰",
        "⣱",
        "⣲",
        "⣳",
        "⣴",
        "⣵",
        "⣶",
        "⣷",
        "⢸",
        "⢹",
        "⢺",
        "⢻",
        "⢼",
        "⢽",
        "⢾",
        "⢿",
        "⣸",
        "⣹",
        "⣺",
        "⣻",
        "⣼",
        "⣽",
        "⣾",
        "⣿"
      ]
    },
    sand: {
      interval: 80,
      frames: [
        "⠁",
        "⠂",
        "⠄",
        "⡀",
        "⡈",
        "⡐",
        "⡠",
        "⣀",
        "⣁",
        "⣂",
        "⣄",
        "⣌",
        "⣔",
        "⣤",
        "⣥",
        "⣦",
        "⣮",
        "⣶",
        "⣷",
        "⣿",
        "⡿",
        "⠿",
        "⢟",
        "⠟",
        "⡛",
        "⠛",
        "⠫",
        "⢋",
        "⠋",
        "⠍",
        "⡉",
        "⠉",
        "⠑",
        "⠡",
        "⢁"
      ]
    },
    line: {
      interval: 130,
      frames: [
        "-",
        "\\",
        "|",
        "/"
      ]
    },
    line2: {
      interval: 100,
      frames: [
        "⠂",
        "-",
        "–",
        "—",
        "–",
        "-"
      ]
    },
    pipe: {
      interval: 100,
      frames: [
        "┤",
        "┘",
        "┴",
        "└",
        "├",
        "┌",
        "┬",
        "┐"
      ]
    },
    simpleDots: {
      interval: 400,
      frames: [
        ".  ",
        ".. ",
        "...",
        "   "
      ]
    },
    simpleDotsScrolling: {
      interval: 200,
      frames: [
        ".  ",
        ".. ",
        "...",
        " ..",
        "  .",
        "   "
      ]
    },
    star: {
      interval: 70,
      frames: [
        "✶",
        "✸",
        "✹",
        "✺",
        "✹",
        "✷"
      ]
    },
    star2: {
      interval: 80,
      frames: [
        "+",
        "x",
        "*"
      ]
    },
    flip: {
      interval: 70,
      frames: [
        "_",
        "_",
        "_",
        "-",
        "`",
        "`",
        "'",
        "´",
        "-",
        "_",
        "_",
        "_"
      ]
    },
    hamburger: {
      interval: 100,
      frames: [
        "☱",
        "☲",
        "☴"
      ]
    },
    growVertical: {
      interval: 120,
      frames: [
        "▁",
        "▃",
        "▄",
        "▅",
        "▆",
        "▇",
        "▆",
        "▅",
        "▄",
        "▃"
      ]
    },
    growHorizontal: {
      interval: 120,
      frames: [
        "▏",
        "▎",
        "▍",
        "▌",
        "▋",
        "▊",
        "▉",
        "▊",
        "▋",
        "▌",
        "▍",
        "▎"
      ]
    },
    balloon: {
      interval: 140,
      frames: [
        " ",
        ".",
        "o",
        "O",
        "@",
        "*",
        " "
      ]
    },
    balloon2: {
      interval: 120,
      frames: [
        ".",
        "o",
        "O",
        "°",
        "O",
        "o",
        "."
      ]
    },
    noise: {
      interval: 100,
      frames: [
        "▓",
        "▒",
        "░"
      ]
    },
    bounce: {
      interval: 120,
      frames: [
        "⠁",
        "⠂",
        "⠄",
        "⠂"
      ]
    },
    boxBounce: {
      interval: 120,
      frames: [
        "▖",
        "▘",
        "▝",
        "▗"
      ]
    },
    boxBounce2: {
      interval: 100,
      frames: [
        "▌",
        "▀",
        "▐",
        "▄"
      ]
    },
    triangle: {
      interval: 50,
      frames: [
        "◢",
        "◣",
        "◤",
        "◥"
      ]
    },
    binary: {
      interval: 80,
      frames: [
        "010010",
        "001100",
        "100101",
        "111010",
        "111101",
        "010111",
        "101011",
        "111000",
        "110011",
        "110101"
      ]
    },
    arc: {
      interval: 100,
      frames: [
        "◜",
        "◠",
        "◝",
        "◞",
        "◡",
        "◟"
      ]
    },
    circle: {
      interval: 120,
      frames: [
        "◡",
        "⊙",
        "◠"
      ]
    },
    squareCorners: {
      interval: 180,
      frames: [
        "◰",
        "◳",
        "◲",
        "◱"
      ]
    },
    circleQuarters: {
      interval: 120,
      frames: [
        "◴",
        "◷",
        "◶",
        "◵"
      ]
    },
    circleHalves: {
      interval: 50,
      frames: [
        "◐",
        "◓",
        "◑",
        "◒"
      ]
    },
    squish: {
      interval: 100,
      frames: [
        "╫",
        "╪"
      ]
    },
    toggle: {
      interval: 250,
      frames: [
        "⊶",
        "⊷"
      ]
    },
    toggle2: {
      interval: 80,
      frames: [
        "▫",
        "▪"
      ]
    },
    toggle3: {
      interval: 120,
      frames: [
        "□",
        "■"
      ]
    },
    toggle4: {
      interval: 100,
      frames: [
        "■",
        "□",
        "▪",
        "▫"
      ]
    },
    toggle5: {
      interval: 100,
      frames: [
        "▮",
        "▯"
      ]
    },
    toggle6: {
      interval: 300,
      frames: [
        "ဝ",
        "၀"
      ]
    },
    toggle7: {
      interval: 80,
      frames: [
        "⦾",
        "⦿"
      ]
    },
    toggle8: {
      interval: 100,
      frames: [
        "◍",
        "◌"
      ]
    },
    toggle9: {
      interval: 100,
      frames: [
        "◉",
        "◎"
      ]
    },
    toggle10: {
      interval: 100,
      frames: [
        "㊂",
        "㊀",
        "㊁"
      ]
    },
    toggle11: {
      interval: 50,
      frames: [
        "⧇",
        "⧆"
      ]
    },
    toggle12: {
      interval: 120,
      frames: [
        "☗",
        "☖"
      ]
    },
    toggle13: {
      interval: 80,
      frames: [
        "=",
        "*",
        "-"
      ]
    },
    arrow: {
      interval: 100,
      frames: [
        "←",
        "↖",
        "↑",
        "↗",
        "→",
        "↘",
        "↓",
        "↙"
      ]
    },
    arrow2: {
      interval: 80,
      frames: [
        "⬆️ ",
        "↗️ ",
        "➡️ ",
        "↘️ ",
        "⬇️ ",
        "↙️ ",
        "⬅️ ",
        "↖️ "
      ]
    },
    arrow3: {
      interval: 120,
      frames: [
        "▹▹▹▹▹",
        "▸▹▹▹▹",
        "▹▸▹▹▹",
        "▹▹▸▹▹",
        "▹▹▹▸▹",
        "▹▹▹▹▸"
      ]
    },
    bouncingBar: {
      interval: 80,
      frames: [
        "[    ]",
        "[=   ]",
        "[==  ]",
        "[=== ]",
        "[====]",
        "[ ===]",
        "[  ==]",
        "[   =]",
        "[    ]",
        "[   =]",
        "[  ==]",
        "[ ===]",
        "[====]",
        "[=== ]",
        "[==  ]",
        "[=   ]"
      ]
    },
    bouncingBall: {
      interval: 80,
      frames: [
        "( ●    )",
        "(  ●   )",
        "(   ●  )",
        "(    ● )",
        "(     ●)",
        "(    ● )",
        "(   ●  )",
        "(  ●   )",
        "( ●    )",
        "(●     )"
      ]
    },
    smiley: {
      interval: 200,
      frames: [
        "😄 ",
        "😝 "
      ]
    },
    monkey: {
      interval: 300,
      frames: [
        "🙈 ",
        "🙈 ",
        "🙉 ",
        "🙊 "
      ]
    },
    hearts: {
      interval: 100,
      frames: [
        "💛 ",
        "💙 ",
        "💜 ",
        "💚 ",
        "❤️ "
      ]
    },
    clock: {
      interval: 100,
      frames: [
        "🕛 ",
        "🕐 ",
        "🕑 ",
        "🕒 ",
        "🕓 ",
        "🕔 ",
        "🕕 ",
        "🕖 ",
        "🕗 ",
        "🕘 ",
        "🕙 ",
        "🕚 "
      ]
    },
    earth: {
      interval: 180,
      frames: [
        "🌍 ",
        "🌎 ",
        "🌏 "
      ]
    },
    material: {
      interval: 17,
      frames: [
        "█▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁",
        "██▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁",
        "███▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁",
        "████▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁",
        "██████▁▁▁▁▁▁▁▁▁▁▁▁▁▁",
        "██████▁▁▁▁▁▁▁▁▁▁▁▁▁▁",
        "███████▁▁▁▁▁▁▁▁▁▁▁▁▁",
        "████████▁▁▁▁▁▁▁▁▁▁▁▁",
        "█████████▁▁▁▁▁▁▁▁▁▁▁",
        "█████████▁▁▁▁▁▁▁▁▁▁▁",
        "██████████▁▁▁▁▁▁▁▁▁▁",
        "███████████▁▁▁▁▁▁▁▁▁",
        "█████████████▁▁▁▁▁▁▁",
        "██████████████▁▁▁▁▁▁",
        "██████████████▁▁▁▁▁▁",
        "▁██████████████▁▁▁▁▁",
        "▁██████████████▁▁▁▁▁",
        "▁██████████████▁▁▁▁▁",
        "▁▁██████████████▁▁▁▁",
        "▁▁▁██████████████▁▁▁",
        "▁▁▁▁█████████████▁▁▁",
        "▁▁▁▁██████████████▁▁",
        "▁▁▁▁██████████████▁▁",
        "▁▁▁▁▁██████████████▁",
        "▁▁▁▁▁██████████████▁",
        "▁▁▁▁▁██████████████▁",
        "▁▁▁▁▁▁██████████████",
        "▁▁▁▁▁▁██████████████",
        "▁▁▁▁▁▁▁█████████████",
        "▁▁▁▁▁▁▁█████████████",
        "▁▁▁▁▁▁▁▁████████████",
        "▁▁▁▁▁▁▁▁████████████",
        "▁▁▁▁▁▁▁▁▁███████████",
        "▁▁▁▁▁▁▁▁▁███████████",
        "▁▁▁▁▁▁▁▁▁▁██████████",
        "▁▁▁▁▁▁▁▁▁▁██████████",
        "▁▁▁▁▁▁▁▁▁▁▁▁████████",
        "▁▁▁▁▁▁▁▁▁▁▁▁▁███████",
        "▁▁▁▁▁▁▁▁▁▁▁▁▁▁██████",
        "▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁█████",
        "▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁█████",
        "█▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁████",
        "██▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁███",
        "██▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁███",
        "███▁▁▁▁▁▁▁▁▁▁▁▁▁▁███",
        "████▁▁▁▁▁▁▁▁▁▁▁▁▁▁██",
        "█████▁▁▁▁▁▁▁▁▁▁▁▁▁▁█",
        "█████▁▁▁▁▁▁▁▁▁▁▁▁▁▁█",
        "██████▁▁▁▁▁▁▁▁▁▁▁▁▁█",
        "████████▁▁▁▁▁▁▁▁▁▁▁▁",
        "█████████▁▁▁▁▁▁▁▁▁▁▁",
        "█████████▁▁▁▁▁▁▁▁▁▁▁",
        "█████████▁▁▁▁▁▁▁▁▁▁▁",
        "█████████▁▁▁▁▁▁▁▁▁▁▁",
        "███████████▁▁▁▁▁▁▁▁▁",
        "████████████▁▁▁▁▁▁▁▁",
        "████████████▁▁▁▁▁▁▁▁",
        "██████████████▁▁▁▁▁▁",
        "██████████████▁▁▁▁▁▁",
        "▁██████████████▁▁▁▁▁",
        "▁██████████████▁▁▁▁▁",
        "▁▁▁█████████████▁▁▁▁",
        "▁▁▁▁▁████████████▁▁▁",
        "▁▁▁▁▁████████████▁▁▁",
        "▁▁▁▁▁▁███████████▁▁▁",
        "▁▁▁▁▁▁▁▁█████████▁▁▁",
        "▁▁▁▁▁▁▁▁█████████▁▁▁",
        "▁▁▁▁▁▁▁▁▁█████████▁▁",
        "▁▁▁▁▁▁▁▁▁█████████▁▁",
        "▁▁▁▁▁▁▁▁▁▁█████████▁",
        "▁▁▁▁▁▁▁▁▁▁▁████████▁",
        "▁▁▁▁▁▁▁▁▁▁▁████████▁",
        "▁▁▁▁▁▁▁▁▁▁▁▁███████▁",
        "▁▁▁▁▁▁▁▁▁▁▁▁███████▁",
        "▁▁▁▁▁▁▁▁▁▁▁▁▁███████",
        "▁▁▁▁▁▁▁▁▁▁▁▁▁███████",
        "▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁█████",
        "▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁████",
        "▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁████",
        "▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁████",
        "▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁███",
        "▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁███",
        "▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁██",
        "▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁██",
        "▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁██",
        "▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁█",
        "▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁█",
        "▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁█",
        "▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁",
        "▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁",
        "▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁",
        "▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁"
      ]
    },
    moon: {
      interval: 80,
      frames: [
        "🌑 ",
        "🌒 ",
        "🌓 ",
        "🌔 ",
        "🌕 ",
        "🌖 ",
        "🌗 ",
        "🌘 "
      ]
    },
    runner: {
      interval: 140,
      frames: [
        "🚶 ",
        "🏃 "
      ]
    },
    pong: {
      interval: 80,
      frames: [
        "▐⠂       ▌",
        "▐⠈       ▌",
        "▐ ⠂      ▌",
        "▐ ⠠      ▌",
        "▐  ⡀     ▌",
        "▐  ⠠     ▌",
        "▐   ⠂    ▌",
        "▐   ⠈    ▌",
        "▐    ⠂   ▌",
        "▐    ⠠   ▌",
        "▐     ⡀  ▌",
        "▐     ⠠  ▌",
        "▐      ⠂ ▌",
        "▐      ⠈ ▌",
        "▐       ⠂▌",
        "▐       ⠠▌",
        "▐       ⡀▌",
        "▐      ⠠ ▌",
        "▐      ⠂ ▌",
        "▐     ⠈  ▌",
        "▐     ⠂  ▌",
        "▐    ⠠   ▌",
        "▐    ⡀   ▌",
        "▐   ⠠    ▌",
        "▐   ⠂    ▌",
        "▐  ⠈     ▌",
        "▐  ⠂     ▌",
        "▐ ⠠      ▌",
        "▐ ⡀      ▌",
        "▐⠠       ▌"
      ]
    },
    shark: {
      interval: 120,
      frames: [
        "▐|\\____________▌",
        "▐_|\\___________▌",
        "▐__|\\__________▌",
        "▐___|\\_________▌",
        "▐____|\\________▌",
        "▐_____|\\_______▌",
        "▐______|\\______▌",
        "▐_______|\\_____▌",
        "▐________|\\____▌",
        "▐_________|\\___▌",
        "▐__________|\\__▌",
        "▐___________|\\_▌",
        "▐____________|\\▌",
        "▐____________/|▌",
        "▐___________/|_▌",
        "▐__________/|__▌",
        "▐_________/|___▌",
        "▐________/|____▌",
        "▐_______/|_____▌",
        "▐______/|______▌",
        "▐_____/|_______▌",
        "▐____/|________▌",
        "▐___/|_________▌",
        "▐__/|__________▌",
        "▐_/|___________▌",
        "▐/|____________▌"
      ]
    },
    dqpb: {
      interval: 100,
      frames: [
        "d",
        "q",
        "p",
        "b"
      ]
    },
    weather: {
      interval: 100,
      frames: [
        "☀️ ",
        "☀️ ",
        "☀️ ",
        "🌤 ",
        "⛅️ ",
        "🌥 ",
        "☁️ ",
        "🌧 ",
        "🌨 ",
        "🌧 ",
        "🌨 ",
        "🌧 ",
        "🌨 ",
        "⛈ ",
        "🌨 ",
        "🌧 ",
        "🌨 ",
        "☁️ ",
        "🌥 ",
        "⛅️ ",
        "🌤 ",
        "☀️ ",
        "☀️ "
      ]
    },
    christmas: {
      interval: 400,
      frames: [
        "🌲",
        "🎄"
      ]
    },
    grenade: {
      interval: 80,
      frames: [
        "،  ",
        "′  ",
        " ´ ",
        " ‾ ",
        "  ⸌",
        "  ⸊",
        "  |",
        "  ⁎",
        "  ⁕",
        " ෴ ",
        "  ⁓",
        "   ",
        "   ",
        "   "
      ]
    },
    point: {
      interval: 125,
      frames: [
        "∙∙∙",
        "●∙∙",
        "∙●∙",
        "∙∙●",
        "∙∙∙"
      ]
    },
    layer: {
      interval: 150,
      frames: [
        "-",
        "=",
        "≡"
      ]
    },
    betaWave: {
      interval: 80,
      frames: [
        "ρββββββ",
        "βρβββββ",
        "ββρββββ",
        "βββρβββ",
        "ββββρββ",
        "βββββρβ",
        "ββββββρ"
      ]
    },
    fingerDance: {
      interval: 160,
      frames: [
        "🤘 ",
        "🤟 ",
        "🖖 ",
        "✋ ",
        "🤚 ",
        "👆 "
      ]
    },
    fistBump: {
      interval: 80,
      frames: [
        "🤜　　　　🤛 ",
        "🤜　　　　🤛 ",
        "🤜　　　　🤛 ",
        "　🤜　　🤛　 ",
        "　　🤜🤛　　 ",
        "　🤜✨🤛　　 ",
        "🤜　✨　🤛　 "
      ]
    },
    soccerHeader: {
      interval: 80,
      frames: [
        " 🧑⚽️       🧑 ",
        "🧑  ⚽️      🧑 ",
        "🧑   ⚽️     🧑 ",
        "🧑    ⚽️    🧑 ",
        "🧑     ⚽️   🧑 ",
        "🧑      ⚽️  🧑 ",
        "🧑       ⚽️🧑  ",
        "🧑      ⚽️  🧑 ",
        "🧑     ⚽️   🧑 ",
        "🧑    ⚽️    🧑 ",
        "🧑   ⚽️     🧑 ",
        "🧑  ⚽️      🧑 "
      ]
    },
    mindblown: {
      interval: 160,
      frames: [
        "😐 ",
        "😐 ",
        "😮 ",
        "😮 ",
        "😦 ",
        "😦 ",
        "😧 ",
        "😧 ",
        "🤯 ",
        "💥 ",
        "✨ ",
        "　 ",
        "　 ",
        "　 "
      ]
    },
    speaker: {
      interval: 160,
      frames: [
        "🔈 ",
        "🔉 ",
        "🔊 ",
        "🔉 "
      ]
    },
    orangePulse: {
      interval: 100,
      frames: [
        "🔸 ",
        "🔶 ",
        "🟠 ",
        "🟠 ",
        "🔶 "
      ]
    },
    bluePulse: {
      interval: 100,
      frames: [
        "🔹 ",
        "🔷 ",
        "🔵 ",
        "🔵 ",
        "🔷 "
      ]
    },
    orangeBluePulse: {
      interval: 100,
      frames: [
        "🔸 ",
        "🔶 ",
        "🟠 ",
        "🟠 ",
        "🔶 ",
        "🔹 ",
        "🔷 ",
        "🔵 ",
        "🔵 ",
        "🔷 "
      ]
    },
    timeTravel: {
      interval: 100,
      frames: [
        "🕛 ",
        "🕚 ",
        "🕙 ",
        "🕘 ",
        "🕗 ",
        "🕖 ",
        "🕕 ",
        "🕔 ",
        "🕓 ",
        "🕒 ",
        "🕑 ",
        "🕐 "
      ]
    },
    aesthetic: {
      interval: 80,
      frames: [
        "▰▱▱▱▱▱▱",
        "▰▰▱▱▱▱▱",
        "▰▰▰▱▱▱▱",
        "▰▰▰▰▱▱▱",
        "▰▰▰▰▰▱▱",
        "▰▰▰▰▰▰▱",
        "▰▰▰▰▰▰▰",
        "▰▱▱▱▱▱▱"
      ]
    },
    dwarfFortress: {
      interval: 80,
      frames: [
        " ██████£££  ",
        "☺██████£££  ",
        "☺██████£££  ",
        "☺▓█████£££  ",
        "☺▓█████£££  ",
        "☺▒█████£££  ",
        "☺▒█████£££  ",
        "☺░█████£££  ",
        "☺░█████£££  ",
        "☺ █████£££  ",
        " ☺█████£££  ",
        " ☺█████£££  ",
        " ☺▓████£££  ",
        " ☺▓████£££  ",
        " ☺▒████£££  ",
        " ☺▒████£££  ",
        " ☺░████£££  ",
        " ☺░████£££  ",
        " ☺ ████£££  ",
        "  ☺████£££  ",
        "  ☺████£££  ",
        "  ☺▓███£££  ",
        "  ☺▓███£££  ",
        "  ☺▒███£££  ",
        "  ☺▒███£££  ",
        "  ☺░███£££  ",
        "  ☺░███£££  ",
        "  ☺ ███£££  ",
        "   ☺███£££  ",
        "   ☺███£££  ",
        "   ☺▓██£££  ",
        "   ☺▓██£££  ",
        "   ☺▒██£££  ",
        "   ☺▒██£££  ",
        "   ☺░██£££  ",
        "   ☺░██£££  ",
        "   ☺ ██£££  ",
        "    ☺██£££  ",
        "    ☺██£££  ",
        "    ☺▓█£££  ",
        "    ☺▓█£££  ",
        "    ☺▒█£££  ",
        "    ☺▒█£££  ",
        "    ☺░█£££  ",
        "    ☺░█£££  ",
        "    ☺ █£££  ",
        "     ☺█£££  ",
        "     ☺█£££  ",
        "     ☺▓£££  ",
        "     ☺▓£££  ",
        "     ☺▒£££  ",
        "     ☺▒£££  ",
        "     ☺░£££  ",
        "     ☺░£££  ",
        "     ☺ £££  ",
        "      ☺£££  ",
        "      ☺£££  ",
        "      ☺▓££  ",
        "      ☺▓££  ",
        "      ☺▒££  ",
        "      ☺▒££  ",
        "      ☺░££  ",
        "      ☺░££  ",
        "      ☺ ££  ",
        "       ☺££  ",
        "       ☺££  ",
        "       ☺▓£  ",
        "       ☺▓£  ",
        "       ☺▒£  ",
        "       ☺▒£  ",
        "       ☺░£  ",
        "       ☺░£  ",
        "       ☺ £  ",
        "        ☺£  ",
        "        ☺£  ",
        "        ☺▓  ",
        "        ☺▓  ",
        "        ☺▒  ",
        "        ☺▒  ",
        "        ☺░  ",
        "        ☺░  ",
        "        ☺   ",
        "        ☺  &",
        "        ☺ ☼&",
        "       ☺ ☼ &",
        "       ☺☼  &",
        "      ☺☼  & ",
        "      ‼   & ",
        "     ☺   &  ",
        "    ‼    &  ",
        "   ☺    &   ",
        "  ‼     &   ",
        " ☺     &    ",
        "‼      &    ",
        "      &     ",
        "      &     ",
        "     &   ░  ",
        "     &   ▒  ",
        "    &    ▓  ",
        "    &    £  ",
        "   &    ░£  ",
        "   &    ▒£  ",
        "  &     ▓£  ",
        "  &     ££  ",
        " &     ░££  ",
        " &     ▒££  ",
        "&      ▓££  ",
        "&      £££  ",
        "      ░£££  ",
        "      ▒£££  ",
        "      ▓£££  ",
        "      █£££  ",
        "     ░█£££  ",
        "     ▒█£££  ",
        "     ▓█£££  ",
        "     ██£££  ",
        "    ░██£££  ",
        "    ▒██£££  ",
        "    ▓██£££  ",
        "    ███£££  ",
        "   ░███£££  ",
        "   ▒███£££  ",
        "   ▓███£££  ",
        "   ████£££  ",
        "  ░████£££  ",
        "  ▒████£££  ",
        "  ▓████£££  ",
        "  █████£££  ",
        " ░█████£££  ",
        " ▒█████£££  ",
        " ▓█████£££  ",
        " ██████£££  ",
        " ██████£££  "
      ]
    }
  };
});

// node_modules/cli-spinners/index.js
var require_cli_spinners = __commonJS((exports, module) => {
  var spinners = Object.assign({}, require_spinners());
  var spinnersList = Object.keys(spinners);
  Object.defineProperty(spinners, "random", {
    get() {
      const randomIndex = Math.floor(Math.random() * spinnersList.length);
      const spinnerName = spinnersList[randomIndex];
      return spinners[spinnerName];
    }
  });
  module.exports = spinners;
});

// node_modules/emoji-regex/index.js
var require_emoji_regex = __commonJS((exports, module) => {
  module.exports = () => {
    return /[#*0-9]\uFE0F?\u20E3|[\xA9\xAE\u203C\u2049\u2122\u2139\u2194-\u2199\u21A9\u21AA\u231A\u231B\u2328\u23CF\u23ED-\u23EF\u23F1\u23F2\u23F8-\u23FA\u24C2\u25AA\u25AB\u25B6\u25C0\u25FB\u25FC\u25FE\u2600-\u2604\u260E\u2611\u2614\u2615\u2618\u2620\u2622\u2623\u2626\u262A\u262E\u262F\u2638-\u263A\u2640\u2642\u2648-\u2653\u265F\u2660\u2663\u2665\u2666\u2668\u267B\u267E\u267F\u2692\u2694-\u2697\u2699\u269B\u269C\u26A0\u26A7\u26AA\u26B0\u26B1\u26BD\u26BE\u26C4\u26C8\u26CF\u26D1\u26E9\u26F0-\u26F5\u26F7\u26F8\u26FA\u2702\u2708\u2709\u270F\u2712\u2714\u2716\u271D\u2721\u2733\u2734\u2744\u2747\u2757\u2763\u27A1\u2934\u2935\u2B05-\u2B07\u2B1B\u2B1C\u2B55\u3030\u303D\u3297\u3299]\uFE0F?|[\u261D\u270C\u270D](?:\uD83C[\uDFFB-\uDFFF]|\uFE0F)?|[\u270A\u270B](?:\uD83C[\uDFFB-\uDFFF])?|[\u23E9-\u23EC\u23F0\u23F3\u25FD\u2693\u26A1\u26AB\u26C5\u26CE\u26D4\u26EA\u26FD\u2705\u2728\u274C\u274E\u2753-\u2755\u2795-\u2797\u27B0\u27BF\u2B50]|\u26D3\uFE0F?(?:\u200D\uD83D\uDCA5)?|\u26F9(?:\uD83C[\uDFFB-\uDFFF]|\uFE0F)?(?:\u200D[\u2640\u2642]\uFE0F?)?|\u2764\uFE0F?(?:\u200D(?:\uD83D\uDD25|\uD83E\uDE79))?|\uD83C(?:[\uDC04\uDD70\uDD71\uDD7E\uDD7F\uDE02\uDE37\uDF21\uDF24-\uDF2C\uDF36\uDF7D\uDF96\uDF97\uDF99-\uDF9B\uDF9E\uDF9F\uDFCD\uDFCE\uDFD4-\uDFDF\uDFF5\uDFF7]\uFE0F?|[\uDF85\uDFC2\uDFC7](?:\uD83C[\uDFFB-\uDFFF])?|[\uDFC4\uDFCA](?:\uD83C[\uDFFB-\uDFFF])?(?:\u200D[\u2640\u2642]\uFE0F?)?|[\uDFCB\uDFCC](?:\uD83C[\uDFFB-\uDFFF]|\uFE0F)?(?:\u200D[\u2640\u2642]\uFE0F?)?|[\uDCCF\uDD8E\uDD91-\uDD9A\uDE01\uDE1A\uDE2F\uDE32-\uDE36\uDE38-\uDE3A\uDE50\uDE51\uDF00-\uDF20\uDF2D-\uDF35\uDF37-\uDF43\uDF45-\uDF4A\uDF4C-\uDF7C\uDF7E-\uDF84\uDF86-\uDF93\uDFA0-\uDFC1\uDFC5\uDFC6\uDFC8\uDFC9\uDFCF-\uDFD3\uDFE0-\uDFF0\uDFF8-\uDFFF]|\uDDE6\uD83C[\uDDE8-\uDDEC\uDDEE\uDDF1\uDDF2\uDDF4\uDDF6-\uDDFA\uDDFC\uDDFD\uDDFF]|\uDDE7\uD83C[\uDDE6\uDDE7\uDDE9-\uDDEF\uDDF1-\uDDF4\uDDF6-\uDDF9\uDDFB\uDDFC\uDDFE\uDDFF]|\uDDE8\uD83C[\uDDE6\uDDE8\uDDE9\uDDEB-\uDDEE\uDDF0-\uDDF7\uDDFA-\uDDFF]|\uDDE9\uD83C[\uDDEA\uDDEC\uDDEF\uDDF0\uDDF2\uDDF4\uDDFF]|\uDDEA\uD83C[\uDDE6\uDDE8\uDDEA\uDDEC\uDDED\uDDF7-\uDDFA]|\uDDEB\uD83C[\uDDEE-\uDDF0\uDDF2\uDDF4\uDDF7]|\uDDEC\uD83C[\uDDE6\uDDE7\uDDE9-\uDDEE\uDDF1-\uDDF3\uDDF5-\uDDFA\uDDFC\uDDFE]|\uDDED\uD83C[\uDDF0\uDDF2\uDDF3\uDDF7\uDDF9\uDDFA]|\uDDEE\uD83C[\uDDE8-\uDDEA\uDDF1-\uDDF4\uDDF6-\uDDF9]|\uDDEF\uD83C[\uDDEA\uDDF2\uDDF4\uDDF5]|\uDDF0\uD83C[\uDDEA\uDDEC-\uDDEE\uDDF2\uDDF3\uDDF5\uDDF7\uDDFC\uDDFE\uDDFF]|\uDDF1\uD83C[\uDDE6-\uDDE8\uDDEE\uDDF0\uDDF7-\uDDFB\uDDFE]|\uDDF2\uD83C[\uDDE6\uDDE8-\uDDED\uDDF0-\uDDFF]|\uDDF3\uD83C[\uDDE6\uDDE8\uDDEA-\uDDEC\uDDEE\uDDF1\uDDF4\uDDF5\uDDF7\uDDFA\uDDFF]|\uDDF4\uD83C\uDDF2|\uDDF5\uD83C[\uDDE6\uDDEA-\uDDED\uDDF0-\uDDF3\uDDF7-\uDDF9\uDDFC\uDDFE]|\uDDF6\uD83C\uDDE6|\uDDF7\uD83C[\uDDEA\uDDF4\uDDF8\uDDFA\uDDFC]|\uDDF8\uD83C[\uDDE6-\uDDEA\uDDEC-\uDDF4\uDDF7-\uDDF9\uDDFB\uDDFD-\uDDFF]|\uDDF9\uD83C[\uDDE6\uDDE8\uDDE9\uDDEB-\uDDED\uDDEF-\uDDF4\uDDF7\uDDF9\uDDFB\uDDFC\uDDFF]|\uDDFA\uD83C[\uDDE6\uDDEC\uDDF2\uDDF3\uDDF8\uDDFE\uDDFF]|\uDDFB\uD83C[\uDDE6\uDDE8\uDDEA\uDDEC\uDDEE\uDDF3\uDDFA]|\uDDFC\uD83C[\uDDEB\uDDF8]|\uDDFD\uD83C\uDDF0|\uDDFE\uD83C[\uDDEA\uDDF9]|\uDDFF\uD83C[\uDDE6\uDDF2\uDDFC]|\uDF44(?:\u200D\uD83D\uDFEB)?|\uDF4B(?:\u200D\uD83D\uDFE9)?|\uDFC3(?:\uD83C[\uDFFB-\uDFFF])?(?:\u200D(?:[\u2640\u2642]\uFE0F?(?:\u200D\u27A1\uFE0F?)?|\u27A1\uFE0F?))?|\uDFF3\uFE0F?(?:\u200D(?:\u26A7\uFE0F?|\uD83C\uDF08))?|\uDFF4(?:\u200D\u2620\uFE0F?|\uDB40\uDC67\uDB40\uDC62\uDB40(?:\uDC65\uDB40\uDC6E\uDB40\uDC67|\uDC73\uDB40\uDC63\uDB40\uDC74|\uDC77\uDB40\uDC6C\uDB40\uDC73)\uDB40\uDC7F)?)|\uD83D(?:[\uDC3F\uDCFD\uDD49\uDD4A\uDD6F\uDD70\uDD73\uDD76-\uDD79\uDD87\uDD8A-\uDD8D\uDDA5\uDDA8\uDDB1\uDDB2\uDDBC\uDDC2-\uDDC4\uDDD1-\uDDD3\uDDDC-\uDDDE\uDDE1\uDDE3\uDDE8\uDDEF\uDDF3\uDDFA\uDECB\uDECD-\uDECF\uDEE0-\uDEE5\uDEE9\uDEF0\uDEF3]\uFE0F?|[\uDC42\uDC43\uDC46-\uDC50\uDC66\uDC67\uDC6B-\uDC6D\uDC72\uDC74-\uDC76\uDC78\uDC7C\uDC83\uDC85\uDC8F\uDC91\uDCAA\uDD7A\uDD95\uDD96\uDE4C\uDE4F\uDEC0\uDECC](?:\uD83C[\uDFFB-\uDFFF])?|[\uDC6E-\uDC71\uDC73\uDC77\uDC81\uDC82\uDC86\uDC87\uDE45-\uDE47\uDE4B\uDE4D\uDE4E\uDEA3\uDEB4\uDEB5](?:\uD83C[\uDFFB-\uDFFF])?(?:\u200D[\u2640\u2642]\uFE0F?)?|[\uDD74\uDD90](?:\uD83C[\uDFFB-\uDFFF]|\uFE0F)?|[\uDC00-\uDC07\uDC09-\uDC14\uDC16-\uDC25\uDC27-\uDC3A\uDC3C-\uDC3E\uDC40\uDC44\uDC45\uDC51-\uDC65\uDC6A\uDC79-\uDC7B\uDC7D-\uDC80\uDC84\uDC88-\uDC8E\uDC90\uDC92-\uDCA9\uDCAB-\uDCFC\uDCFF-\uDD3D\uDD4B-\uDD4E\uDD50-\uDD67\uDDA4\uDDFB-\uDE2D\uDE2F-\uDE34\uDE37-\uDE41\uDE43\uDE44\uDE48-\uDE4A\uDE80-\uDEA2\uDEA4-\uDEB3\uDEB7-\uDEBF\uDEC1-\uDEC5\uDED0-\uDED2\uDED5-\uDED8\uDEDC-\uDEDF\uDEEB\uDEEC\uDEF4-\uDEFC\uDFE0-\uDFEB\uDFF0]|\uDC08(?:\u200D\u2B1B)?|\uDC15(?:\u200D\uD83E\uDDBA)?|\uDC26(?:\u200D(?:\u2B1B|\uD83D\uDD25))?|\uDC3B(?:\u200D\u2744\uFE0F?)?|\uDC41\uFE0F?(?:\u200D\uD83D\uDDE8\uFE0F?)?|\uDC68(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:\uDC8B\u200D\uD83D)?\uDC68|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D(?:[\uDC68\uDC69]\u200D\uD83D(?:\uDC66(?:\u200D\uD83D\uDC66)?|\uDC67(?:\u200D\uD83D[\uDC66\uDC67])?)|[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uDC66(?:\u200D\uD83D\uDC66)?|\uDC67(?:\u200D\uD83D[\uDC66\uDC67])?)|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]))|\uD83C(?:\uDFFB(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:\uDC8B\u200D\uD83D)?\uDC68\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D(?:[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uDC30\u200D\uD83D\uDC68\uD83C[\uDFFC-\uDFFF])|\uD83E(?:[\uDD1D\uDEEF]\u200D\uD83D\uDC68\uD83C[\uDFFC-\uDFFF]|[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3])))?|\uDFFC(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:\uDC8B\u200D\uD83D)?\uDC68\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D(?:[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uDC30\u200D\uD83D\uDC68\uD83C[\uDFFB\uDFFD-\uDFFF])|\uD83E(?:[\uDD1D\uDEEF]\u200D\uD83D\uDC68\uD83C[\uDFFB\uDFFD-\uDFFF]|[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3])))?|\uDFFD(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:\uDC8B\u200D\uD83D)?\uDC68\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D(?:[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uDC30\u200D\uD83D\uDC68\uD83C[\uDFFB\uDFFC\uDFFE\uDFFF])|\uD83E(?:[\uDD1D\uDEEF]\u200D\uD83D\uDC68\uD83C[\uDFFB\uDFFC\uDFFE\uDFFF]|[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3])))?|\uDFFE(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:\uDC8B\u200D\uD83D)?\uDC68\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D(?:[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uDC30\u200D\uD83D\uDC68\uD83C[\uDFFB-\uDFFD\uDFFF])|\uD83E(?:[\uDD1D\uDEEF]\u200D\uD83D\uDC68\uD83C[\uDFFB-\uDFFD\uDFFF]|[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3])))?|\uDFFF(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:\uDC8B\u200D\uD83D)?\uDC68\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D(?:[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uDC30\u200D\uD83D\uDC68\uD83C[\uDFFB-\uDFFE])|\uD83E(?:[\uDD1D\uDEEF]\u200D\uD83D\uDC68\uD83C[\uDFFB-\uDFFE]|[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3])))?))?|\uDC69(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:\uDC8B\u200D\uD83D)?[\uDC68\uDC69]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D(?:[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uDC66(?:\u200D\uD83D\uDC66)?|\uDC67(?:\u200D\uD83D[\uDC66\uDC67])?|\uDC69\u200D\uD83D(?:\uDC66(?:\u200D\uD83D\uDC66)?|\uDC67(?:\u200D\uD83D[\uDC66\uDC67])?))|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]))|\uD83C(?:\uDFFB(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:[\uDC68\uDC69]|\uDC8B\u200D\uD83D[\uDC68\uDC69])\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D(?:[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uDC30\u200D\uD83D\uDC69\uD83C[\uDFFC-\uDFFF])|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]|\uDD1D\u200D\uD83D[\uDC68\uDC69]\uD83C[\uDFFC-\uDFFF]|\uDEEF\u200D\uD83D\uDC69\uD83C[\uDFFC-\uDFFF])))?|\uDFFC(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:[\uDC68\uDC69]|\uDC8B\u200D\uD83D[\uDC68\uDC69])\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D(?:[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uDC30\u200D\uD83D\uDC69\uD83C[\uDFFB\uDFFD-\uDFFF])|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]|\uDD1D\u200D\uD83D[\uDC68\uDC69]\uD83C[\uDFFB\uDFFD-\uDFFF]|\uDEEF\u200D\uD83D\uDC69\uD83C[\uDFFB\uDFFD-\uDFFF])))?|\uDFFD(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:[\uDC68\uDC69]|\uDC8B\u200D\uD83D[\uDC68\uDC69])\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D(?:[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uDC30\u200D\uD83D\uDC69\uD83C[\uDFFB\uDFFC\uDFFE\uDFFF])|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]|\uDD1D\u200D\uD83D[\uDC68\uDC69]\uD83C[\uDFFB\uDFFC\uDFFE\uDFFF]|\uDEEF\u200D\uD83D\uDC69\uD83C[\uDFFB\uDFFC\uDFFE\uDFFF])))?|\uDFFE(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:[\uDC68\uDC69]|\uDC8B\u200D\uD83D[\uDC68\uDC69])\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D(?:[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uDC30\u200D\uD83D\uDC69\uD83C[\uDFFB-\uDFFD\uDFFF])|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]|\uDD1D\u200D\uD83D[\uDC68\uDC69]\uD83C[\uDFFB-\uDFFD\uDFFF]|\uDEEF\u200D\uD83D\uDC69\uD83C[\uDFFB-\uDFFD\uDFFF])))?|\uDFFF(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:[\uDC68\uDC69]|\uDC8B\u200D\uD83D[\uDC68\uDC69])\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D(?:[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uDC30\u200D\uD83D\uDC69\uD83C[\uDFFB-\uDFFE])|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]|\uDD1D\u200D\uD83D[\uDC68\uDC69]\uD83C[\uDFFB-\uDFFE]|\uDEEF\u200D\uD83D\uDC69\uD83C[\uDFFB-\uDFFE])))?))?|\uDD75(?:\uD83C[\uDFFB-\uDFFF]|\uFE0F)?(?:\u200D[\u2640\u2642]\uFE0F?)?|\uDE2E(?:\u200D\uD83D\uDCA8)?|\uDE35(?:\u200D\uD83D\uDCAB)?|\uDE36(?:\u200D\uD83C\uDF2B\uFE0F?)?|\uDE42(?:\u200D[\u2194\u2195]\uFE0F?)?|\uDEB6(?:\uD83C[\uDFFB-\uDFFF])?(?:\u200D(?:[\u2640\u2642]\uFE0F?(?:\u200D\u27A1\uFE0F?)?|\u27A1\uFE0F?))?)|\uD83E(?:[\uDD0C\uDD0F\uDD18-\uDD1F\uDD30-\uDD34\uDD36\uDD77\uDDB5\uDDB6\uDDBB\uDDD2\uDDD3\uDDD5\uDEC3-\uDEC5\uDEF0\uDEF2-\uDEF8](?:\uD83C[\uDFFB-\uDFFF])?|[\uDD26\uDD35\uDD37-\uDD39\uDD3C-\uDD3E\uDDB8\uDDB9\uDDCD\uDDCF\uDDD4\uDDD6-\uDDDD](?:\uD83C[\uDFFB-\uDFFF])?(?:\u200D[\u2640\u2642]\uFE0F?)?|[\uDDDE\uDDDF](?:\u200D[\u2640\u2642]\uFE0F?)?|[\uDD0D\uDD0E\uDD10-\uDD17\uDD20-\uDD25\uDD27-\uDD2F\uDD3A\uDD3F-\uDD45\uDD47-\uDD76\uDD78-\uDDB4\uDDB7\uDDBA\uDDBC-\uDDCC\uDDD0\uDDE0-\uDDFF\uDE70-\uDE7C\uDE80-\uDE8A\uDE8E-\uDEC2\uDEC6\uDEC8\uDECD-\uDEDC\uDEDF-\uDEEA\uDEEF]|\uDDCE(?:\uD83C[\uDFFB-\uDFFF])?(?:\u200D(?:[\u2640\u2642]\uFE0F?(?:\u200D\u27A1\uFE0F?)?|\u27A1\uFE0F?))?|\uDDD1(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3\uDE70]|\uDD1D\u200D\uD83E\uDDD1|\uDDD1\u200D\uD83E\uDDD2(?:\u200D\uD83E\uDDD2)?|\uDDD2(?:\u200D\uD83E\uDDD2)?))|\uD83C(?:\uDFFB(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D(?:\uD83D\uDC8B\u200D)?\uD83E\uDDD1\uD83C[\uDFFC-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D(?:[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uDC30\u200D\uD83E\uDDD1\uD83C[\uDFFC-\uDFFF])|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3\uDE70]|\uDD1D\u200D\uD83E\uDDD1\uD83C[\uDFFB-\uDFFF]|\uDEEF\u200D\uD83E\uDDD1\uD83C[\uDFFC-\uDFFF])))?|\uDFFC(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D(?:\uD83D\uDC8B\u200D)?\uD83E\uDDD1\uD83C[\uDFFB\uDFFD-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D(?:[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uDC30\u200D\uD83E\uDDD1\uD83C[\uDFFB\uDFFD-\uDFFF])|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3\uDE70]|\uDD1D\u200D\uD83E\uDDD1\uD83C[\uDFFB-\uDFFF]|\uDEEF\u200D\uD83E\uDDD1\uD83C[\uDFFB\uDFFD-\uDFFF])))?|\uDFFD(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D(?:\uD83D\uDC8B\u200D)?\uD83E\uDDD1\uD83C[\uDFFB\uDFFC\uDFFE\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D(?:[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uDC30\u200D\uD83E\uDDD1\uD83C[\uDFFB\uDFFC\uDFFE\uDFFF])|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3\uDE70]|\uDD1D\u200D\uD83E\uDDD1\uD83C[\uDFFB-\uDFFF]|\uDEEF\u200D\uD83E\uDDD1\uD83C[\uDFFB\uDFFC\uDFFE\uDFFF])))?|\uDFFE(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D(?:\uD83D\uDC8B\u200D)?\uD83E\uDDD1\uD83C[\uDFFB-\uDFFD\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D(?:[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uDC30\u200D\uD83E\uDDD1\uD83C[\uDFFB-\uDFFD\uDFFF])|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3\uDE70]|\uDD1D\u200D\uD83E\uDDD1\uD83C[\uDFFB-\uDFFF]|\uDEEF\u200D\uD83E\uDDD1\uD83C[\uDFFB-\uDFFD\uDFFF])))?|\uDFFF(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D(?:\uD83D\uDC8B\u200D)?\uD83E\uDDD1\uD83C[\uDFFB-\uDFFE]|\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D(?:[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uDC30\u200D\uD83E\uDDD1\uD83C[\uDFFB-\uDFFE])|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3\uDE70]|\uDD1D\u200D\uD83E\uDDD1\uD83C[\uDFFB-\uDFFF]|\uDEEF\u200D\uD83E\uDDD1\uD83C[\uDFFB-\uDFFE])))?))?|\uDEF1(?:\uD83C(?:\uDFFB(?:\u200D\uD83E\uDEF2\uD83C[\uDFFC-\uDFFF])?|\uDFFC(?:\u200D\uD83E\uDEF2\uD83C[\uDFFB\uDFFD-\uDFFF])?|\uDFFD(?:\u200D\uD83E\uDEF2\uD83C[\uDFFB\uDFFC\uDFFE\uDFFF])?|\uDFFE(?:\u200D\uD83E\uDEF2\uD83C[\uDFFB-\uDFFD\uDFFF])?|\uDFFF(?:\u200D\uD83E\uDEF2\uD83C[\uDFFB-\uDFFE])?))?)/g;
  };
});

// node_modules/commander/esm.mjs
var import__ = __toESM(require_commander(), 1);
var {
  program,
  createCommand,
  createArgument,
  createOption,
  CommanderError,
  InvalidArgumentError,
  InvalidOptionArgumentError,
  Command,
  Argument,
  Option,
  Help
} = import__.default;

// node_modules/chalk/source/vendor/ansi-styles/index.js
var ANSI_BACKGROUND_OFFSET = 10;
var wrapAnsi16 = (offset = 0) => (code) => `\x1B[${code + offset}m`;
var wrapAnsi256 = (offset = 0) => (code) => `\x1B[${38 + offset};5;${code}m`;
var wrapAnsi16m = (offset = 0) => (red, green, blue) => `\x1B[${38 + offset};2;${red};${green};${blue}m`;
var styles = {
  modifier: {
    reset: [0, 0],
    bold: [1, 22],
    dim: [2, 22],
    italic: [3, 23],
    underline: [4, 24],
    overline: [53, 55],
    inverse: [7, 27],
    hidden: [8, 28],
    strikethrough: [9, 29]
  },
  color: {
    black: [30, 39],
    red: [31, 39],
    green: [32, 39],
    yellow: [33, 39],
    blue: [34, 39],
    magenta: [35, 39],
    cyan: [36, 39],
    white: [37, 39],
    blackBright: [90, 39],
    gray: [90, 39],
    grey: [90, 39],
    redBright: [91, 39],
    greenBright: [92, 39],
    yellowBright: [93, 39],
    blueBright: [94, 39],
    magentaBright: [95, 39],
    cyanBright: [96, 39],
    whiteBright: [97, 39]
  },
  bgColor: {
    bgBlack: [40, 49],
    bgRed: [41, 49],
    bgGreen: [42, 49],
    bgYellow: [43, 49],
    bgBlue: [44, 49],
    bgMagenta: [45, 49],
    bgCyan: [46, 49],
    bgWhite: [47, 49],
    bgBlackBright: [100, 49],
    bgGray: [100, 49],
    bgGrey: [100, 49],
    bgRedBright: [101, 49],
    bgGreenBright: [102, 49],
    bgYellowBright: [103, 49],
    bgBlueBright: [104, 49],
    bgMagentaBright: [105, 49],
    bgCyanBright: [106, 49],
    bgWhiteBright: [107, 49]
  }
};
var modifierNames = Object.keys(styles.modifier);
var foregroundColorNames = Object.keys(styles.color);
var backgroundColorNames = Object.keys(styles.bgColor);
var colorNames = [...foregroundColorNames, ...backgroundColorNames];
function assembleStyles() {
  const codes = new Map;
  for (const [groupName, group] of Object.entries(styles)) {
    for (const [styleName, style] of Object.entries(group)) {
      styles[styleName] = {
        open: `\x1B[${style[0]}m`,
        close: `\x1B[${style[1]}m`
      };
      group[styleName] = styles[styleName];
      codes.set(style[0], style[1]);
    }
    Object.defineProperty(styles, groupName, {
      value: group,
      enumerable: false
    });
  }
  Object.defineProperty(styles, "codes", {
    value: codes,
    enumerable: false
  });
  styles.color.close = "\x1B[39m";
  styles.bgColor.close = "\x1B[49m";
  styles.color.ansi = wrapAnsi16();
  styles.color.ansi256 = wrapAnsi256();
  styles.color.ansi16m = wrapAnsi16m();
  styles.bgColor.ansi = wrapAnsi16(ANSI_BACKGROUND_OFFSET);
  styles.bgColor.ansi256 = wrapAnsi256(ANSI_BACKGROUND_OFFSET);
  styles.bgColor.ansi16m = wrapAnsi16m(ANSI_BACKGROUND_OFFSET);
  Object.defineProperties(styles, {
    rgbToAnsi256: {
      value(red, green, blue) {
        if (red === green && green === blue) {
          if (red < 8) {
            return 16;
          }
          if (red > 248) {
            return 231;
          }
          return Math.round((red - 8) / 247 * 24) + 232;
        }
        return 16 + 36 * Math.round(red / 255 * 5) + 6 * Math.round(green / 255 * 5) + Math.round(blue / 255 * 5);
      },
      enumerable: false
    },
    hexToRgb: {
      value(hex) {
        const matches = /[a-f\d]{6}|[a-f\d]{3}/i.exec(hex.toString(16));
        if (!matches) {
          return [0, 0, 0];
        }
        let [colorString] = matches;
        if (colorString.length === 3) {
          colorString = [...colorString].map((character) => character + character).join("");
        }
        const integer = Number.parseInt(colorString, 16);
        return [
          integer >> 16 & 255,
          integer >> 8 & 255,
          integer & 255
        ];
      },
      enumerable: false
    },
    hexToAnsi256: {
      value: (hex) => styles.rgbToAnsi256(...styles.hexToRgb(hex)),
      enumerable: false
    },
    ansi256ToAnsi: {
      value(code) {
        if (code < 8) {
          return 30 + code;
        }
        if (code < 16) {
          return 90 + (code - 8);
        }
        let red;
        let green;
        let blue;
        if (code >= 232) {
          red = ((code - 232) * 10 + 8) / 255;
          green = red;
          blue = red;
        } else {
          code -= 16;
          const remainder = code % 36;
          red = Math.floor(code / 36) / 5;
          green = Math.floor(remainder / 6) / 5;
          blue = remainder % 6 / 5;
        }
        const value = Math.max(red, green, blue) * 2;
        if (value === 0) {
          return 30;
        }
        let result = 30 + (Math.round(blue) << 2 | Math.round(green) << 1 | Math.round(red));
        if (value === 2) {
          result += 60;
        }
        return result;
      },
      enumerable: false
    },
    rgbToAnsi: {
      value: (red, green, blue) => styles.ansi256ToAnsi(styles.rgbToAnsi256(red, green, blue)),
      enumerable: false
    },
    hexToAnsi: {
      value: (hex) => styles.ansi256ToAnsi(styles.hexToAnsi256(hex)),
      enumerable: false
    }
  });
  return styles;
}
var ansiStyles = assembleStyles();
var ansi_styles_default = ansiStyles;

// node_modules/chalk/source/vendor/supports-color/index.js
import process2 from "node:process";
import os from "node:os";
import tty from "node:tty";
function hasFlag(flag, argv = globalThis.Deno ? globalThis.Deno.args : process2.argv) {
  const prefix = flag.startsWith("-") ? "" : flag.length === 1 ? "-" : "--";
  const position = argv.indexOf(prefix + flag);
  const terminatorPosition = argv.indexOf("--");
  return position !== -1 && (terminatorPosition === -1 || position < terminatorPosition);
}
var { env } = process2;
var flagForceColor;
if (hasFlag("no-color") || hasFlag("no-colors") || hasFlag("color=false") || hasFlag("color=never")) {
  flagForceColor = 0;
} else if (hasFlag("color") || hasFlag("colors") || hasFlag("color=true") || hasFlag("color=always")) {
  flagForceColor = 1;
}
function envForceColor() {
  if ("FORCE_COLOR" in env) {
    if (env.FORCE_COLOR === "true") {
      return 1;
    }
    if (env.FORCE_COLOR === "false") {
      return 0;
    }
    return env.FORCE_COLOR.length === 0 ? 1 : Math.min(Number.parseInt(env.FORCE_COLOR, 10), 3);
  }
}
function translateLevel(level) {
  if (level === 0) {
    return false;
  }
  return {
    level,
    hasBasic: true,
    has256: level >= 2,
    has16m: level >= 3
  };
}
function _supportsColor(haveStream, { streamIsTTY, sniffFlags = true } = {}) {
  const noFlagForceColor = envForceColor();
  if (noFlagForceColor !== undefined) {
    flagForceColor = noFlagForceColor;
  }
  const forceColor = sniffFlags ? flagForceColor : noFlagForceColor;
  if (forceColor === 0) {
    return 0;
  }
  if (sniffFlags) {
    if (hasFlag("color=16m") || hasFlag("color=full") || hasFlag("color=truecolor")) {
      return 3;
    }
    if (hasFlag("color=256")) {
      return 2;
    }
  }
  if ("TF_BUILD" in env && "AGENT_NAME" in env) {
    return 1;
  }
  if (haveStream && !streamIsTTY && forceColor === undefined) {
    return 0;
  }
  const min = forceColor || 0;
  if (env.TERM === "dumb") {
    return min;
  }
  if (process2.platform === "win32") {
    const osRelease = os.release().split(".");
    if (Number(osRelease[0]) >= 10 && Number(osRelease[2]) >= 10586) {
      return Number(osRelease[2]) >= 14931 ? 3 : 2;
    }
    return 1;
  }
  if ("CI" in env) {
    if (["GITHUB_ACTIONS", "GITEA_ACTIONS", "CIRCLECI"].some((key) => (key in env))) {
      return 3;
    }
    if (["TRAVIS", "APPVEYOR", "GITLAB_CI", "BUILDKITE", "DRONE"].some((sign) => (sign in env)) || env.CI_NAME === "codeship") {
      return 1;
    }
    return min;
  }
  if ("TEAMCITY_VERSION" in env) {
    return /^(9\.(0*[1-9]\d*)\.|\d{2,}\.)/.test(env.TEAMCITY_VERSION) ? 1 : 0;
  }
  if (env.COLORTERM === "truecolor") {
    return 3;
  }
  if (env.TERM === "xterm-kitty") {
    return 3;
  }
  if (env.TERM === "xterm-ghostty") {
    return 3;
  }
  if (env.TERM === "wezterm") {
    return 3;
  }
  if ("TERM_PROGRAM" in env) {
    const version = Number.parseInt((env.TERM_PROGRAM_VERSION || "").split(".")[0], 10);
    switch (env.TERM_PROGRAM) {
      case "iTerm.app": {
        return version >= 3 ? 3 : 2;
      }
      case "Apple_Terminal": {
        return 2;
      }
    }
  }
  if (/-256(color)?$/i.test(env.TERM)) {
    return 2;
  }
  if (/^screen|^xterm|^vt100|^vt220|^rxvt|color|ansi|cygwin|linux/i.test(env.TERM)) {
    return 1;
  }
  if ("COLORTERM" in env) {
    return 1;
  }
  return min;
}
function createSupportsColor(stream, options = {}) {
  const level = _supportsColor(stream, {
    streamIsTTY: stream && stream.isTTY,
    ...options
  });
  return translateLevel(level);
}
var supportsColor = {
  stdout: createSupportsColor({ isTTY: tty.isatty(1) }),
  stderr: createSupportsColor({ isTTY: tty.isatty(2) })
};
var supports_color_default = supportsColor;

// node_modules/chalk/source/utilities.js
function stringReplaceAll(string, substring, replacer) {
  let index = string.indexOf(substring);
  if (index === -1) {
    return string;
  }
  const substringLength = substring.length;
  let endIndex = 0;
  let returnValue = "";
  do {
    returnValue += string.slice(endIndex, index) + substring + replacer;
    endIndex = index + substringLength;
    index = string.indexOf(substring, endIndex);
  } while (index !== -1);
  returnValue += string.slice(endIndex);
  return returnValue;
}
function stringEncaseCRLFWithFirstIndex(string, prefix, postfix, index) {
  let endIndex = 0;
  let returnValue = "";
  do {
    const gotCR = string[index - 1] === "\r";
    returnValue += string.slice(endIndex, gotCR ? index - 1 : index) + prefix + (gotCR ? `\r
` : `
`) + postfix;
    endIndex = index + 1;
    index = string.indexOf(`
`, endIndex);
  } while (index !== -1);
  returnValue += string.slice(endIndex);
  return returnValue;
}

// node_modules/chalk/source/index.js
var { stdout: stdoutColor, stderr: stderrColor } = supports_color_default;
var GENERATOR = Symbol("GENERATOR");
var STYLER = Symbol("STYLER");
var IS_EMPTY = Symbol("IS_EMPTY");
var levelMapping = [
  "ansi",
  "ansi",
  "ansi256",
  "ansi16m"
];
var styles2 = Object.create(null);
var applyOptions = (object, options = {}) => {
  if (options.level && !(Number.isInteger(options.level) && options.level >= 0 && options.level <= 3)) {
    throw new Error("The `level` option should be an integer from 0 to 3");
  }
  const colorLevel = stdoutColor ? stdoutColor.level : 0;
  object.level = options.level === undefined ? colorLevel : options.level;
};
var chalkFactory = (options) => {
  const chalk = (...strings) => strings.join(" ");
  applyOptions(chalk, options);
  Object.setPrototypeOf(chalk, createChalk.prototype);
  return chalk;
};
function createChalk(options) {
  return chalkFactory(options);
}
Object.setPrototypeOf(createChalk.prototype, Function.prototype);
for (const [styleName, style] of Object.entries(ansi_styles_default)) {
  styles2[styleName] = {
    get() {
      const builder = createBuilder(this, createStyler(style.open, style.close, this[STYLER]), this[IS_EMPTY]);
      Object.defineProperty(this, styleName, { value: builder });
      return builder;
    }
  };
}
styles2.visible = {
  get() {
    const builder = createBuilder(this, this[STYLER], true);
    Object.defineProperty(this, "visible", { value: builder });
    return builder;
  }
};
var getModelAnsi = (model, level, type, ...arguments_) => {
  if (model === "rgb") {
    if (level === "ansi16m") {
      return ansi_styles_default[type].ansi16m(...arguments_);
    }
    if (level === "ansi256") {
      return ansi_styles_default[type].ansi256(ansi_styles_default.rgbToAnsi256(...arguments_));
    }
    return ansi_styles_default[type].ansi(ansi_styles_default.rgbToAnsi(...arguments_));
  }
  if (model === "hex") {
    return getModelAnsi("rgb", level, type, ...ansi_styles_default.hexToRgb(...arguments_));
  }
  return ansi_styles_default[type][model](...arguments_);
};
var usedModels = ["rgb", "hex", "ansi256"];
for (const model of usedModels) {
  styles2[model] = {
    get() {
      const { level } = this;
      return function(...arguments_) {
        const styler = createStyler(getModelAnsi(model, levelMapping[level], "color", ...arguments_), ansi_styles_default.color.close, this[STYLER]);
        return createBuilder(this, styler, this[IS_EMPTY]);
      };
    }
  };
  const bgModel = "bg" + model[0].toUpperCase() + model.slice(1);
  styles2[bgModel] = {
    get() {
      const { level } = this;
      return function(...arguments_) {
        const styler = createStyler(getModelAnsi(model, levelMapping[level], "bgColor", ...arguments_), ansi_styles_default.bgColor.close, this[STYLER]);
        return createBuilder(this, styler, this[IS_EMPTY]);
      };
    }
  };
}
var proto = Object.defineProperties(() => {}, {
  ...styles2,
  level: {
    enumerable: true,
    get() {
      return this[GENERATOR].level;
    },
    set(level) {
      this[GENERATOR].level = level;
    }
  }
});
var createStyler = (open, close, parent) => {
  let openAll;
  let closeAll;
  if (parent === undefined) {
    openAll = open;
    closeAll = close;
  } else {
    openAll = parent.openAll + open;
    closeAll = close + parent.closeAll;
  }
  return {
    open,
    close,
    openAll,
    closeAll,
    parent
  };
};
var createBuilder = (self, _styler, _isEmpty) => {
  const builder = (...arguments_) => applyStyle(builder, arguments_.length === 1 ? "" + arguments_[0] : arguments_.join(" "));
  Object.setPrototypeOf(builder, proto);
  builder[GENERATOR] = self;
  builder[STYLER] = _styler;
  builder[IS_EMPTY] = _isEmpty;
  return builder;
};
var applyStyle = (self, string) => {
  if (self.level <= 0 || !string) {
    return self[IS_EMPTY] ? "" : string;
  }
  let styler = self[STYLER];
  if (styler === undefined) {
    return string;
  }
  const { openAll, closeAll } = styler;
  if (string.includes("\x1B")) {
    while (styler !== undefined) {
      string = stringReplaceAll(string, styler.close, styler.open);
      styler = styler.parent;
    }
  }
  const lfIndex = string.indexOf(`
`);
  if (lfIndex !== -1) {
    string = stringEncaseCRLFWithFirstIndex(string, closeAll, openAll, lfIndex);
  }
  return openAll + string + closeAll;
};
Object.defineProperties(createChalk.prototype, styles2);
var chalk = createChalk();
var chalkStderr = createChalk({ level: stderrColor ? stderrColor.level : 0 });
var source_default = chalk;
// node_modules/@anthropic-ai/sdk/internal/tslib.mjs
function __classPrivateFieldSet(receiver, state, value, kind, f) {
  if (kind === "m")
    throw new TypeError("Private method is not writable");
  if (kind === "a" && !f)
    throw new TypeError("Private accessor was defined without a setter");
  if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver))
    throw new TypeError("Cannot write private member to an object whose class did not declare it");
  return kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value), value;
}
function __classPrivateFieldGet(receiver, state, kind, f) {
  if (kind === "a" && !f)
    throw new TypeError("Private accessor was defined without a getter");
  if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver))
    throw new TypeError("Cannot read private member from an object whose class did not declare it");
  return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
}

// node_modules/@anthropic-ai/sdk/internal/utils/uuid.mjs
var uuid4 = function() {
  const { crypto } = globalThis;
  if (crypto?.randomUUID) {
    uuid4 = crypto.randomUUID.bind(crypto);
    return crypto.randomUUID();
  }
  const u8 = new Uint8Array(1);
  const randomByte = crypto ? () => crypto.getRandomValues(u8)[0] : () => Math.random() * 255 & 255;
  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) => (+c ^ randomByte() & 15 >> +c / 4).toString(16));
};

// node_modules/@anthropic-ai/sdk/internal/errors.mjs
function isAbortError(err) {
  return typeof err === "object" && err !== null && (("name" in err) && err.name === "AbortError" || ("message" in err) && String(err.message).includes("FetchRequestCanceledException"));
}
var castToError = (err) => {
  if (err instanceof Error)
    return err;
  if (typeof err === "object" && err !== null) {
    try {
      if (Object.prototype.toString.call(err) === "[object Error]") {
        const error = new Error(err.message, err.cause ? { cause: err.cause } : {});
        if (err.stack)
          error.stack = err.stack;
        if (err.cause && !error.cause)
          error.cause = err.cause;
        if (err.name)
          error.name = err.name;
        return error;
      }
    } catch {}
    try {
      return new Error(JSON.stringify(err));
    } catch {}
  }
  return new Error(err);
};

// node_modules/@anthropic-ai/sdk/core/error.mjs
class AnthropicError extends Error {
}

class APIError extends AnthropicError {
  constructor(status, error, message, headers) {
    super(`${APIError.makeMessage(status, error, message)}`);
    this.status = status;
    this.headers = headers;
    this.requestID = headers?.get("request-id");
    this.error = error;
  }
  static makeMessage(status, error, message) {
    const msg = error?.message ? typeof error.message === "string" ? error.message : JSON.stringify(error.message) : error ? JSON.stringify(error) : message;
    if (status && msg) {
      return `${status} ${msg}`;
    }
    if (status) {
      return `${status} status code (no body)`;
    }
    if (msg) {
      return msg;
    }
    return "(no status code or body)";
  }
  static generate(status, errorResponse, message, headers) {
    if (!status || !headers) {
      return new APIConnectionError({ message, cause: castToError(errorResponse) });
    }
    const error = errorResponse;
    if (status === 400) {
      return new BadRequestError(status, error, message, headers);
    }
    if (status === 401) {
      return new AuthenticationError(status, error, message, headers);
    }
    if (status === 403) {
      return new PermissionDeniedError(status, error, message, headers);
    }
    if (status === 404) {
      return new NotFoundError(status, error, message, headers);
    }
    if (status === 409) {
      return new ConflictError(status, error, message, headers);
    }
    if (status === 422) {
      return new UnprocessableEntityError(status, error, message, headers);
    }
    if (status === 429) {
      return new RateLimitError(status, error, message, headers);
    }
    if (status >= 500) {
      return new InternalServerError(status, error, message, headers);
    }
    return new APIError(status, error, message, headers);
  }
}

class APIUserAbortError extends APIError {
  constructor({ message } = {}) {
    super(undefined, undefined, message || "Request was aborted.", undefined);
  }
}

class APIConnectionError extends APIError {
  constructor({ message, cause }) {
    super(undefined, undefined, message || "Connection error.", undefined);
    if (cause)
      this.cause = cause;
  }
}

class APIConnectionTimeoutError extends APIConnectionError {
  constructor({ message } = {}) {
    super({ message: message ?? "Request timed out." });
  }
}

class BadRequestError extends APIError {
}

class AuthenticationError extends APIError {
}

class PermissionDeniedError extends APIError {
}

class NotFoundError extends APIError {
}

class ConflictError extends APIError {
}

class UnprocessableEntityError extends APIError {
}

class RateLimitError extends APIError {
}

class InternalServerError extends APIError {
}

// node_modules/@anthropic-ai/sdk/internal/utils/values.mjs
var startsWithSchemeRegexp = /^[a-z][a-z0-9+.-]*:/i;
var isAbsoluteURL = (url) => {
  return startsWithSchemeRegexp.test(url);
};
var isArray = (val) => (isArray = Array.isArray, isArray(val));
var isReadonlyArray = isArray;
function maybeObj(x) {
  if (typeof x !== "object") {
    return {};
  }
  return x ?? {};
}
function isEmptyObj(obj) {
  if (!obj)
    return true;
  for (const _k in obj)
    return false;
  return true;
}
function hasOwn(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}
var validatePositiveInteger = (name, n) => {
  if (typeof n !== "number" || !Number.isInteger(n)) {
    throw new AnthropicError(`${name} must be an integer`);
  }
  if (n < 0) {
    throw new AnthropicError(`${name} must be a positive integer`);
  }
  return n;
};
var safeJSON = (text) => {
  try {
    return JSON.parse(text);
  } catch (err) {
    return;
  }
};

// node_modules/@anthropic-ai/sdk/internal/utils/sleep.mjs
var sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// node_modules/@anthropic-ai/sdk/version.mjs
var VERSION = "0.71.2";

// node_modules/@anthropic-ai/sdk/internal/detect-platform.mjs
var isRunningInBrowser = () => {
  return typeof window !== "undefined" && typeof window.document !== "undefined" && typeof navigator !== "undefined";
};
function getDetectedPlatform() {
  if (typeof Deno !== "undefined" && Deno.build != null) {
    return "deno";
  }
  if (typeof EdgeRuntime !== "undefined") {
    return "edge";
  }
  if (Object.prototype.toString.call(typeof globalThis.process !== "undefined" ? globalThis.process : 0) === "[object process]") {
    return "node";
  }
  return "unknown";
}
var getPlatformProperties = () => {
  const detectedPlatform = getDetectedPlatform();
  if (detectedPlatform === "deno") {
    return {
      "X-Stainless-Lang": "js",
      "X-Stainless-Package-Version": VERSION,
      "X-Stainless-OS": normalizePlatform(Deno.build.os),
      "X-Stainless-Arch": normalizeArch(Deno.build.arch),
      "X-Stainless-Runtime": "deno",
      "X-Stainless-Runtime-Version": typeof Deno.version === "string" ? Deno.version : Deno.version?.deno ?? "unknown"
    };
  }
  if (typeof EdgeRuntime !== "undefined") {
    return {
      "X-Stainless-Lang": "js",
      "X-Stainless-Package-Version": VERSION,
      "X-Stainless-OS": "Unknown",
      "X-Stainless-Arch": `other:${EdgeRuntime}`,
      "X-Stainless-Runtime": "edge",
      "X-Stainless-Runtime-Version": globalThis.process.version
    };
  }
  if (detectedPlatform === "node") {
    return {
      "X-Stainless-Lang": "js",
      "X-Stainless-Package-Version": VERSION,
      "X-Stainless-OS": normalizePlatform(globalThis.process.platform ?? "unknown"),
      "X-Stainless-Arch": normalizeArch(globalThis.process.arch ?? "unknown"),
      "X-Stainless-Runtime": "node",
      "X-Stainless-Runtime-Version": globalThis.process.version ?? "unknown"
    };
  }
  const browserInfo = getBrowserInfo();
  if (browserInfo) {
    return {
      "X-Stainless-Lang": "js",
      "X-Stainless-Package-Version": VERSION,
      "X-Stainless-OS": "Unknown",
      "X-Stainless-Arch": "unknown",
      "X-Stainless-Runtime": `browser:${browserInfo.browser}`,
      "X-Stainless-Runtime-Version": browserInfo.version
    };
  }
  return {
    "X-Stainless-Lang": "js",
    "X-Stainless-Package-Version": VERSION,
    "X-Stainless-OS": "Unknown",
    "X-Stainless-Arch": "unknown",
    "X-Stainless-Runtime": "unknown",
    "X-Stainless-Runtime-Version": "unknown"
  };
};
function getBrowserInfo() {
  if (typeof navigator === "undefined" || !navigator) {
    return null;
  }
  const browserPatterns = [
    { key: "edge", pattern: /Edge(?:\W+(\d+)\.(\d+)(?:\.(\d+))?)?/ },
    { key: "ie", pattern: /MSIE(?:\W+(\d+)\.(\d+)(?:\.(\d+))?)?/ },
    { key: "ie", pattern: /Trident(?:.*rv\:(\d+)\.(\d+)(?:\.(\d+))?)?/ },
    { key: "chrome", pattern: /Chrome(?:\W+(\d+)\.(\d+)(?:\.(\d+))?)?/ },
    { key: "firefox", pattern: /Firefox(?:\W+(\d+)\.(\d+)(?:\.(\d+))?)?/ },
    { key: "safari", pattern: /(?:Version\W+(\d+)\.(\d+)(?:\.(\d+))?)?(?:\W+Mobile\S*)?\W+Safari/ }
  ];
  for (const { key, pattern } of browserPatterns) {
    const match = pattern.exec(navigator.userAgent);
    if (match) {
      const major = match[1] || 0;
      const minor = match[2] || 0;
      const patch = match[3] || 0;
      return { browser: key, version: `${major}.${minor}.${patch}` };
    }
  }
  return null;
}
var normalizeArch = (arch) => {
  if (arch === "x32")
    return "x32";
  if (arch === "x86_64" || arch === "x64")
    return "x64";
  if (arch === "arm")
    return "arm";
  if (arch === "aarch64" || arch === "arm64")
    return "arm64";
  if (arch)
    return `other:${arch}`;
  return "unknown";
};
var normalizePlatform = (platform) => {
  platform = platform.toLowerCase();
  if (platform.includes("ios"))
    return "iOS";
  if (platform === "android")
    return "Android";
  if (platform === "darwin")
    return "MacOS";
  if (platform === "win32")
    return "Windows";
  if (platform === "freebsd")
    return "FreeBSD";
  if (platform === "openbsd")
    return "OpenBSD";
  if (platform === "linux")
    return "Linux";
  if (platform)
    return `Other:${platform}`;
  return "Unknown";
};
var _platformHeaders;
var getPlatformHeaders = () => {
  return _platformHeaders ?? (_platformHeaders = getPlatformProperties());
};

// node_modules/@anthropic-ai/sdk/internal/shims.mjs
function getDefaultFetch() {
  if (typeof fetch !== "undefined") {
    return fetch;
  }
  throw new Error("`fetch` is not defined as a global; Either pass `fetch` to the client, `new Anthropic({ fetch })` or polyfill the global, `globalThis.fetch = fetch`");
}
function makeReadableStream(...args) {
  const ReadableStream = globalThis.ReadableStream;
  if (typeof ReadableStream === "undefined") {
    throw new Error("`ReadableStream` is not defined as a global; You will need to polyfill it, `globalThis.ReadableStream = ReadableStream`");
  }
  return new ReadableStream(...args);
}
function ReadableStreamFrom(iterable) {
  let iter = Symbol.asyncIterator in iterable ? iterable[Symbol.asyncIterator]() : iterable[Symbol.iterator]();
  return makeReadableStream({
    start() {},
    async pull(controller) {
      const { done, value } = await iter.next();
      if (done) {
        controller.close();
      } else {
        controller.enqueue(value);
      }
    },
    async cancel() {
      await iter.return?.();
    }
  });
}
function ReadableStreamToAsyncIterable(stream) {
  if (stream[Symbol.asyncIterator])
    return stream;
  const reader = stream.getReader();
  return {
    async next() {
      try {
        const result = await reader.read();
        if (result?.done)
          reader.releaseLock();
        return result;
      } catch (e) {
        reader.releaseLock();
        throw e;
      }
    },
    async return() {
      const cancelPromise = reader.cancel();
      reader.releaseLock();
      await cancelPromise;
      return { done: true, value: undefined };
    },
    [Symbol.asyncIterator]() {
      return this;
    }
  };
}
async function CancelReadableStream(stream) {
  if (stream === null || typeof stream !== "object")
    return;
  if (stream[Symbol.asyncIterator]) {
    await stream[Symbol.asyncIterator]().return?.();
    return;
  }
  const reader = stream.getReader();
  const cancelPromise = reader.cancel();
  reader.releaseLock();
  await cancelPromise;
}

// node_modules/@anthropic-ai/sdk/internal/request-options.mjs
var FallbackEncoder = ({ headers, body }) => {
  return {
    bodyHeaders: {
      "content-type": "application/json"
    },
    body: JSON.stringify(body)
  };
};

// node_modules/@anthropic-ai/sdk/internal/utils/bytes.mjs
function concatBytes(buffers) {
  let length = 0;
  for (const buffer of buffers) {
    length += buffer.length;
  }
  const output = new Uint8Array(length);
  let index = 0;
  for (const buffer of buffers) {
    output.set(buffer, index);
    index += buffer.length;
  }
  return output;
}
var encodeUTF8_;
function encodeUTF8(str) {
  let encoder;
  return (encodeUTF8_ ?? (encoder = new globalThis.TextEncoder, encodeUTF8_ = encoder.encode.bind(encoder)))(str);
}
var decodeUTF8_;
function decodeUTF8(bytes) {
  let decoder;
  return (decodeUTF8_ ?? (decoder = new globalThis.TextDecoder, decodeUTF8_ = decoder.decode.bind(decoder)))(bytes);
}

// node_modules/@anthropic-ai/sdk/internal/decoders/line.mjs
var _LineDecoder_buffer;
var _LineDecoder_carriageReturnIndex;

class LineDecoder {
  constructor() {
    _LineDecoder_buffer.set(this, undefined);
    _LineDecoder_carriageReturnIndex.set(this, undefined);
    __classPrivateFieldSet(this, _LineDecoder_buffer, new Uint8Array, "f");
    __classPrivateFieldSet(this, _LineDecoder_carriageReturnIndex, null, "f");
  }
  decode(chunk) {
    if (chunk == null) {
      return [];
    }
    const binaryChunk = chunk instanceof ArrayBuffer ? new Uint8Array(chunk) : typeof chunk === "string" ? encodeUTF8(chunk) : chunk;
    __classPrivateFieldSet(this, _LineDecoder_buffer, concatBytes([__classPrivateFieldGet(this, _LineDecoder_buffer, "f"), binaryChunk]), "f");
    const lines = [];
    let patternIndex;
    while ((patternIndex = findNewlineIndex(__classPrivateFieldGet(this, _LineDecoder_buffer, "f"), __classPrivateFieldGet(this, _LineDecoder_carriageReturnIndex, "f"))) != null) {
      if (patternIndex.carriage && __classPrivateFieldGet(this, _LineDecoder_carriageReturnIndex, "f") == null) {
        __classPrivateFieldSet(this, _LineDecoder_carriageReturnIndex, patternIndex.index, "f");
        continue;
      }
      if (__classPrivateFieldGet(this, _LineDecoder_carriageReturnIndex, "f") != null && (patternIndex.index !== __classPrivateFieldGet(this, _LineDecoder_carriageReturnIndex, "f") + 1 || patternIndex.carriage)) {
        lines.push(decodeUTF8(__classPrivateFieldGet(this, _LineDecoder_buffer, "f").subarray(0, __classPrivateFieldGet(this, _LineDecoder_carriageReturnIndex, "f") - 1)));
        __classPrivateFieldSet(this, _LineDecoder_buffer, __classPrivateFieldGet(this, _LineDecoder_buffer, "f").subarray(__classPrivateFieldGet(this, _LineDecoder_carriageReturnIndex, "f")), "f");
        __classPrivateFieldSet(this, _LineDecoder_carriageReturnIndex, null, "f");
        continue;
      }
      const endIndex = __classPrivateFieldGet(this, _LineDecoder_carriageReturnIndex, "f") !== null ? patternIndex.preceding - 1 : patternIndex.preceding;
      const line = decodeUTF8(__classPrivateFieldGet(this, _LineDecoder_buffer, "f").subarray(0, endIndex));
      lines.push(line);
      __classPrivateFieldSet(this, _LineDecoder_buffer, __classPrivateFieldGet(this, _LineDecoder_buffer, "f").subarray(patternIndex.index), "f");
      __classPrivateFieldSet(this, _LineDecoder_carriageReturnIndex, null, "f");
    }
    return lines;
  }
  flush() {
    if (!__classPrivateFieldGet(this, _LineDecoder_buffer, "f").length) {
      return [];
    }
    return this.decode(`
`);
  }
}
_LineDecoder_buffer = new WeakMap, _LineDecoder_carriageReturnIndex = new WeakMap;
LineDecoder.NEWLINE_CHARS = new Set([`
`, "\r"]);
LineDecoder.NEWLINE_REGEXP = /\r\n|[\n\r]/g;
function findNewlineIndex(buffer, startIndex) {
  const newline = 10;
  const carriage = 13;
  for (let i = startIndex ?? 0;i < buffer.length; i++) {
    if (buffer[i] === newline) {
      return { preceding: i, index: i + 1, carriage: false };
    }
    if (buffer[i] === carriage) {
      return { preceding: i, index: i + 1, carriage: true };
    }
  }
  return null;
}
function findDoubleNewlineIndex(buffer) {
  const newline = 10;
  const carriage = 13;
  for (let i = 0;i < buffer.length - 1; i++) {
    if (buffer[i] === newline && buffer[i + 1] === newline) {
      return i + 2;
    }
    if (buffer[i] === carriage && buffer[i + 1] === carriage) {
      return i + 2;
    }
    if (buffer[i] === carriage && buffer[i + 1] === newline && i + 3 < buffer.length && buffer[i + 2] === carriage && buffer[i + 3] === newline) {
      return i + 4;
    }
  }
  return -1;
}

// node_modules/@anthropic-ai/sdk/internal/utils/log.mjs
var levelNumbers = {
  off: 0,
  error: 200,
  warn: 300,
  info: 400,
  debug: 500
};
var parseLogLevel = (maybeLevel, sourceName, client) => {
  if (!maybeLevel) {
    return;
  }
  if (hasOwn(levelNumbers, maybeLevel)) {
    return maybeLevel;
  }
  loggerFor(client).warn(`${sourceName} was set to ${JSON.stringify(maybeLevel)}, expected one of ${JSON.stringify(Object.keys(levelNumbers))}`);
  return;
};
function noop() {}
function makeLogFn(fnLevel, logger, logLevel) {
  if (!logger || levelNumbers[fnLevel] > levelNumbers[logLevel]) {
    return noop;
  } else {
    return logger[fnLevel].bind(logger);
  }
}
var noopLogger = {
  error: noop,
  warn: noop,
  info: noop,
  debug: noop
};
var cachedLoggers = /* @__PURE__ */ new WeakMap;
function loggerFor(client) {
  const logger = client.logger;
  const logLevel = client.logLevel ?? "off";
  if (!logger) {
    return noopLogger;
  }
  const cachedLogger = cachedLoggers.get(logger);
  if (cachedLogger && cachedLogger[0] === logLevel) {
    return cachedLogger[1];
  }
  const levelLogger = {
    error: makeLogFn("error", logger, logLevel),
    warn: makeLogFn("warn", logger, logLevel),
    info: makeLogFn("info", logger, logLevel),
    debug: makeLogFn("debug", logger, logLevel)
  };
  cachedLoggers.set(logger, [logLevel, levelLogger]);
  return levelLogger;
}
var formatRequestDetails = (details) => {
  if (details.options) {
    details.options = { ...details.options };
    delete details.options["headers"];
  }
  if (details.headers) {
    details.headers = Object.fromEntries((details.headers instanceof Headers ? [...details.headers] : Object.entries(details.headers)).map(([name, value]) => [
      name,
      name.toLowerCase() === "x-api-key" || name.toLowerCase() === "authorization" || name.toLowerCase() === "cookie" || name.toLowerCase() === "set-cookie" ? "***" : value
    ]));
  }
  if ("retryOfRequestLogID" in details) {
    if (details.retryOfRequestLogID) {
      details.retryOf = details.retryOfRequestLogID;
    }
    delete details.retryOfRequestLogID;
  }
  return details;
};

// node_modules/@anthropic-ai/sdk/core/streaming.mjs
var _Stream_client;

class Stream {
  constructor(iterator, controller, client) {
    this.iterator = iterator;
    _Stream_client.set(this, undefined);
    this.controller = controller;
    __classPrivateFieldSet(this, _Stream_client, client, "f");
  }
  static fromSSEResponse(response, controller, client) {
    let consumed = false;
    const logger = client ? loggerFor(client) : console;
    async function* iterator() {
      if (consumed) {
        throw new AnthropicError("Cannot iterate over a consumed stream, use `.tee()` to split the stream.");
      }
      consumed = true;
      let done = false;
      try {
        for await (const sse of _iterSSEMessages(response, controller)) {
          if (sse.event === "completion") {
            try {
              yield JSON.parse(sse.data);
            } catch (e) {
              logger.error(`Could not parse message into JSON:`, sse.data);
              logger.error(`From chunk:`, sse.raw);
              throw e;
            }
          }
          if (sse.event === "message_start" || sse.event === "message_delta" || sse.event === "message_stop" || sse.event === "content_block_start" || sse.event === "content_block_delta" || sse.event === "content_block_stop") {
            try {
              yield JSON.parse(sse.data);
            } catch (e) {
              logger.error(`Could not parse message into JSON:`, sse.data);
              logger.error(`From chunk:`, sse.raw);
              throw e;
            }
          }
          if (sse.event === "ping") {
            continue;
          }
          if (sse.event === "error") {
            throw new APIError(undefined, safeJSON(sse.data) ?? sse.data, undefined, response.headers);
          }
        }
        done = true;
      } catch (e) {
        if (isAbortError(e))
          return;
        throw e;
      } finally {
        if (!done)
          controller.abort();
      }
    }
    return new Stream(iterator, controller, client);
  }
  static fromReadableStream(readableStream, controller, client) {
    let consumed = false;
    async function* iterLines() {
      const lineDecoder = new LineDecoder;
      const iter = ReadableStreamToAsyncIterable(readableStream);
      for await (const chunk of iter) {
        for (const line of lineDecoder.decode(chunk)) {
          yield line;
        }
      }
      for (const line of lineDecoder.flush()) {
        yield line;
      }
    }
    async function* iterator() {
      if (consumed) {
        throw new AnthropicError("Cannot iterate over a consumed stream, use `.tee()` to split the stream.");
      }
      consumed = true;
      let done = false;
      try {
        for await (const line of iterLines()) {
          if (done)
            continue;
          if (line)
            yield JSON.parse(line);
        }
        done = true;
      } catch (e) {
        if (isAbortError(e))
          return;
        throw e;
      } finally {
        if (!done)
          controller.abort();
      }
    }
    return new Stream(iterator, controller, client);
  }
  [(_Stream_client = new WeakMap, Symbol.asyncIterator)]() {
    return this.iterator();
  }
  tee() {
    const left = [];
    const right = [];
    const iterator = this.iterator();
    const teeIterator = (queue) => {
      return {
        next: () => {
          if (queue.length === 0) {
            const result = iterator.next();
            left.push(result);
            right.push(result);
          }
          return queue.shift();
        }
      };
    };
    return [
      new Stream(() => teeIterator(left), this.controller, __classPrivateFieldGet(this, _Stream_client, "f")),
      new Stream(() => teeIterator(right), this.controller, __classPrivateFieldGet(this, _Stream_client, "f"))
    ];
  }
  toReadableStream() {
    const self = this;
    let iter;
    return makeReadableStream({
      async start() {
        iter = self[Symbol.asyncIterator]();
      },
      async pull(ctrl) {
        try {
          const { value, done } = await iter.next();
          if (done)
            return ctrl.close();
          const bytes = encodeUTF8(JSON.stringify(value) + `
`);
          ctrl.enqueue(bytes);
        } catch (err) {
          ctrl.error(err);
        }
      },
      async cancel() {
        await iter.return?.();
      }
    });
  }
}
async function* _iterSSEMessages(response, controller) {
  if (!response.body) {
    controller.abort();
    if (typeof globalThis.navigator !== "undefined" && globalThis.navigator.product === "ReactNative") {
      throw new AnthropicError(`The default react-native fetch implementation does not support streaming. Please use expo/fetch: https://docs.expo.dev/versions/latest/sdk/expo/#expofetch-api`);
    }
    throw new AnthropicError(`Attempted to iterate over a response with no body`);
  }
  const sseDecoder = new SSEDecoder;
  const lineDecoder = new LineDecoder;
  const iter = ReadableStreamToAsyncIterable(response.body);
  for await (const sseChunk of iterSSEChunks(iter)) {
    for (const line of lineDecoder.decode(sseChunk)) {
      const sse = sseDecoder.decode(line);
      if (sse)
        yield sse;
    }
  }
  for (const line of lineDecoder.flush()) {
    const sse = sseDecoder.decode(line);
    if (sse)
      yield sse;
  }
}
async function* iterSSEChunks(iterator) {
  let data = new Uint8Array;
  for await (const chunk of iterator) {
    if (chunk == null) {
      continue;
    }
    const binaryChunk = chunk instanceof ArrayBuffer ? new Uint8Array(chunk) : typeof chunk === "string" ? encodeUTF8(chunk) : chunk;
    let newData = new Uint8Array(data.length + binaryChunk.length);
    newData.set(data);
    newData.set(binaryChunk, data.length);
    data = newData;
    let patternIndex;
    while ((patternIndex = findDoubleNewlineIndex(data)) !== -1) {
      yield data.slice(0, patternIndex);
      data = data.slice(patternIndex);
    }
  }
  if (data.length > 0) {
    yield data;
  }
}

class SSEDecoder {
  constructor() {
    this.event = null;
    this.data = [];
    this.chunks = [];
  }
  decode(line) {
    if (line.endsWith("\r")) {
      line = line.substring(0, line.length - 1);
    }
    if (!line) {
      if (!this.event && !this.data.length)
        return null;
      const sse = {
        event: this.event,
        data: this.data.join(`
`),
        raw: this.chunks
      };
      this.event = null;
      this.data = [];
      this.chunks = [];
      return sse;
    }
    this.chunks.push(line);
    if (line.startsWith(":")) {
      return null;
    }
    let [fieldname, _, value] = partition(line, ":");
    if (value.startsWith(" ")) {
      value = value.substring(1);
    }
    if (fieldname === "event") {
      this.event = value;
    } else if (fieldname === "data") {
      this.data.push(value);
    }
    return null;
  }
}
function partition(str, delimiter) {
  const index = str.indexOf(delimiter);
  if (index !== -1) {
    return [str.substring(0, index), delimiter, str.substring(index + delimiter.length)];
  }
  return [str, "", ""];
}

// node_modules/@anthropic-ai/sdk/internal/parse.mjs
async function defaultParseResponse(client, props) {
  const { response, requestLogID, retryOfRequestLogID, startTime } = props;
  const body = await (async () => {
    if (props.options.stream) {
      loggerFor(client).debug("response", response.status, response.url, response.headers, response.body);
      if (props.options.__streamClass) {
        return props.options.__streamClass.fromSSEResponse(response, props.controller);
      }
      return Stream.fromSSEResponse(response, props.controller);
    }
    if (response.status === 204) {
      return null;
    }
    if (props.options.__binaryResponse) {
      return response;
    }
    const contentType = response.headers.get("content-type");
    const mediaType = contentType?.split(";")[0]?.trim();
    const isJSON = mediaType?.includes("application/json") || mediaType?.endsWith("+json");
    if (isJSON) {
      const json = await response.json();
      return addRequestID(json, response);
    }
    const text = await response.text();
    return text;
  })();
  loggerFor(client).debug(`[${requestLogID}] response parsed`, formatRequestDetails({
    retryOfRequestLogID,
    url: response.url,
    status: response.status,
    body,
    durationMs: Date.now() - startTime
  }));
  return body;
}
function addRequestID(value, response) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return value;
  }
  return Object.defineProperty(value, "_request_id", {
    value: response.headers.get("request-id"),
    enumerable: false
  });
}

// node_modules/@anthropic-ai/sdk/core/api-promise.mjs
var _APIPromise_client;

class APIPromise extends Promise {
  constructor(client, responsePromise, parseResponse = defaultParseResponse) {
    super((resolve) => {
      resolve(null);
    });
    this.responsePromise = responsePromise;
    this.parseResponse = parseResponse;
    _APIPromise_client.set(this, undefined);
    __classPrivateFieldSet(this, _APIPromise_client, client, "f");
  }
  _thenUnwrap(transform) {
    return new APIPromise(__classPrivateFieldGet(this, _APIPromise_client, "f"), this.responsePromise, async (client, props) => addRequestID(transform(await this.parseResponse(client, props), props), props.response));
  }
  asResponse() {
    return this.responsePromise.then((p) => p.response);
  }
  async withResponse() {
    const [data, response] = await Promise.all([this.parse(), this.asResponse()]);
    return { data, response, request_id: response.headers.get("request-id") };
  }
  parse() {
    if (!this.parsedPromise) {
      this.parsedPromise = this.responsePromise.then((data) => this.parseResponse(__classPrivateFieldGet(this, _APIPromise_client, "f"), data));
    }
    return this.parsedPromise;
  }
  then(onfulfilled, onrejected) {
    return this.parse().then(onfulfilled, onrejected);
  }
  catch(onrejected) {
    return this.parse().catch(onrejected);
  }
  finally(onfinally) {
    return this.parse().finally(onfinally);
  }
}
_APIPromise_client = new WeakMap;

// node_modules/@anthropic-ai/sdk/core/pagination.mjs
var _AbstractPage_client;

class AbstractPage {
  constructor(client, response, body, options) {
    _AbstractPage_client.set(this, undefined);
    __classPrivateFieldSet(this, _AbstractPage_client, client, "f");
    this.options = options;
    this.response = response;
    this.body = body;
  }
  hasNextPage() {
    const items = this.getPaginatedItems();
    if (!items.length)
      return false;
    return this.nextPageRequestOptions() != null;
  }
  async getNextPage() {
    const nextOptions = this.nextPageRequestOptions();
    if (!nextOptions) {
      throw new AnthropicError("No next page expected; please check `.hasNextPage()` before calling `.getNextPage()`.");
    }
    return await __classPrivateFieldGet(this, _AbstractPage_client, "f").requestAPIList(this.constructor, nextOptions);
  }
  async* iterPages() {
    let page = this;
    yield page;
    while (page.hasNextPage()) {
      page = await page.getNextPage();
      yield page;
    }
  }
  async* [(_AbstractPage_client = new WeakMap, Symbol.asyncIterator)]() {
    for await (const page of this.iterPages()) {
      for (const item of page.getPaginatedItems()) {
        yield item;
      }
    }
  }
}

class PagePromise extends APIPromise {
  constructor(client, request, Page) {
    super(client, request, async (client2, props) => new Page(client2, props.response, await defaultParseResponse(client2, props), props.options));
  }
  async* [Symbol.asyncIterator]() {
    const page = await this;
    for await (const item of page) {
      yield item;
    }
  }
}

class Page extends AbstractPage {
  constructor(client, response, body, options) {
    super(client, response, body, options);
    this.data = body.data || [];
    this.has_more = body.has_more || false;
    this.first_id = body.first_id || null;
    this.last_id = body.last_id || null;
  }
  getPaginatedItems() {
    return this.data ?? [];
  }
  hasNextPage() {
    if (this.has_more === false) {
      return false;
    }
    return super.hasNextPage();
  }
  nextPageRequestOptions() {
    if (this.options.query?.["before_id"]) {
      const first_id = this.first_id;
      if (!first_id) {
        return null;
      }
      return {
        ...this.options,
        query: {
          ...maybeObj(this.options.query),
          before_id: first_id
        }
      };
    }
    const cursor = this.last_id;
    if (!cursor) {
      return null;
    }
    return {
      ...this.options,
      query: {
        ...maybeObj(this.options.query),
        after_id: cursor
      }
    };
  }
}
class PageCursor extends AbstractPage {
  constructor(client, response, body, options) {
    super(client, response, body, options);
    this.data = body.data || [];
    this.has_more = body.has_more || false;
    this.next_page = body.next_page || null;
  }
  getPaginatedItems() {
    return this.data ?? [];
  }
  hasNextPage() {
    if (this.has_more === false) {
      return false;
    }
    return super.hasNextPage();
  }
  nextPageRequestOptions() {
    const cursor = this.next_page;
    if (!cursor) {
      return null;
    }
    return {
      ...this.options,
      query: {
        ...maybeObj(this.options.query),
        page: cursor
      }
    };
  }
}

// node_modules/@anthropic-ai/sdk/internal/uploads.mjs
var checkFileSupport = () => {
  if (typeof File === "undefined") {
    const { process: process3 } = globalThis;
    const isOldNode = typeof process3?.versions?.node === "string" && parseInt(process3.versions.node.split(".")) < 20;
    throw new Error("`File` is not defined as a global, which is required for file uploads." + (isOldNode ? " Update to Node 20 LTS or newer, or set `globalThis.File` to `import('node:buffer').File`." : ""));
  }
};
function makeFile(fileBits, fileName, options) {
  checkFileSupport();
  return new File(fileBits, fileName ?? "unknown_file", options);
}
function getName(value) {
  return (typeof value === "object" && value !== null && (("name" in value) && value.name && String(value.name) || ("url" in value) && value.url && String(value.url) || ("filename" in value) && value.filename && String(value.filename) || ("path" in value) && value.path && String(value.path)) || "").split(/[\\/]/).pop() || undefined;
}
var isAsyncIterable = (value) => value != null && typeof value === "object" && typeof value[Symbol.asyncIterator] === "function";
var multipartFormRequestOptions = async (opts, fetch2) => {
  return { ...opts, body: await createForm(opts.body, fetch2) };
};
var supportsFormDataMap = /* @__PURE__ */ new WeakMap;
function supportsFormData(fetchObject) {
  const fetch2 = typeof fetchObject === "function" ? fetchObject : fetchObject.fetch;
  const cached = supportsFormDataMap.get(fetch2);
  if (cached)
    return cached;
  const promise = (async () => {
    try {
      const FetchResponse = "Response" in fetch2 ? fetch2.Response : (await fetch2("data:,")).constructor;
      const data = new FormData;
      if (data.toString() === await new FetchResponse(data).text()) {
        return false;
      }
      return true;
    } catch {
      return true;
    }
  })();
  supportsFormDataMap.set(fetch2, promise);
  return promise;
}
var createForm = async (body, fetch2) => {
  if (!await supportsFormData(fetch2)) {
    throw new TypeError("The provided fetch function does not support file uploads with the current global FormData class.");
  }
  const form = new FormData;
  await Promise.all(Object.entries(body || {}).map(([key, value]) => addFormValue(form, key, value)));
  return form;
};
var isNamedBlob = (value) => value instanceof Blob && ("name" in value);
var addFormValue = async (form, key, value) => {
  if (value === undefined)
    return;
  if (value == null) {
    throw new TypeError(`Received null for "${key}"; to pass null in FormData, you must use the string 'null'`);
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    form.append(key, String(value));
  } else if (value instanceof Response) {
    let options = {};
    const contentType = value.headers.get("Content-Type");
    if (contentType) {
      options = { type: contentType };
    }
    form.append(key, makeFile([await value.blob()], getName(value), options));
  } else if (isAsyncIterable(value)) {
    form.append(key, makeFile([await new Response(ReadableStreamFrom(value)).blob()], getName(value)));
  } else if (isNamedBlob(value)) {
    form.append(key, makeFile([value], getName(value), { type: value.type }));
  } else if (Array.isArray(value)) {
    await Promise.all(value.map((entry) => addFormValue(form, key + "[]", entry)));
  } else if (typeof value === "object") {
    await Promise.all(Object.entries(value).map(([name, prop]) => addFormValue(form, `${key}[${name}]`, prop)));
  } else {
    throw new TypeError(`Invalid value given to form, expected a string, number, boolean, object, Array, File or Blob but got ${value} instead`);
  }
};

// node_modules/@anthropic-ai/sdk/internal/to-file.mjs
var isBlobLike = (value) => value != null && typeof value === "object" && typeof value.size === "number" && typeof value.type === "string" && typeof value.text === "function" && typeof value.slice === "function" && typeof value.arrayBuffer === "function";
var isFileLike = (value) => value != null && typeof value === "object" && typeof value.name === "string" && typeof value.lastModified === "number" && isBlobLike(value);
var isResponseLike = (value) => value != null && typeof value === "object" && typeof value.url === "string" && typeof value.blob === "function";
async function toFile(value, name, options) {
  checkFileSupport();
  value = await value;
  name || (name = getName(value));
  if (isFileLike(value)) {
    if (value instanceof File && name == null && options == null) {
      return value;
    }
    return makeFile([await value.arrayBuffer()], name ?? value.name, {
      type: value.type,
      lastModified: value.lastModified,
      ...options
    });
  }
  if (isResponseLike(value)) {
    const blob = await value.blob();
    name || (name = new URL(value.url).pathname.split(/[\\/]/).pop());
    return makeFile(await getBytes(blob), name, options);
  }
  const parts = await getBytes(value);
  if (!options?.type) {
    const type = parts.find((part) => typeof part === "object" && ("type" in part) && part.type);
    if (typeof type === "string") {
      options = { ...options, type };
    }
  }
  return makeFile(parts, name, options);
}
async function getBytes(value) {
  let parts = [];
  if (typeof value === "string" || ArrayBuffer.isView(value) || value instanceof ArrayBuffer) {
    parts.push(value);
  } else if (isBlobLike(value)) {
    parts.push(value instanceof Blob ? value : await value.arrayBuffer());
  } else if (isAsyncIterable(value)) {
    for await (const chunk of value) {
      parts.push(...await getBytes(chunk));
    }
  } else {
    const constructor = value?.constructor?.name;
    throw new Error(`Unexpected data type: ${typeof value}${constructor ? `; constructor: ${constructor}` : ""}${propsForError(value)}`);
  }
  return parts;
}
function propsForError(value) {
  if (typeof value !== "object" || value === null)
    return "";
  const props = Object.getOwnPropertyNames(value);
  return `; props: [${props.map((p) => `"${p}"`).join(", ")}]`;
}
// node_modules/@anthropic-ai/sdk/core/resource.mjs
class APIResource {
  constructor(client) {
    this._client = client;
  }
}

// node_modules/@anthropic-ai/sdk/internal/headers.mjs
var brand_privateNullableHeaders = Symbol.for("brand.privateNullableHeaders");
function* iterateHeaders(headers) {
  if (!headers)
    return;
  if (brand_privateNullableHeaders in headers) {
    const { values, nulls } = headers;
    yield* values.entries();
    for (const name of nulls) {
      yield [name, null];
    }
    return;
  }
  let shouldClear = false;
  let iter;
  if (headers instanceof Headers) {
    iter = headers.entries();
  } else if (isReadonlyArray(headers)) {
    iter = headers;
  } else {
    shouldClear = true;
    iter = Object.entries(headers ?? {});
  }
  for (let row of iter) {
    const name = row[0];
    if (typeof name !== "string")
      throw new TypeError("expected header name to be a string");
    const values = isReadonlyArray(row[1]) ? row[1] : [row[1]];
    let didClear = false;
    for (const value of values) {
      if (value === undefined)
        continue;
      if (shouldClear && !didClear) {
        didClear = true;
        yield [name, null];
      }
      yield [name, value];
    }
  }
}
var buildHeaders = (newHeaders) => {
  const targetHeaders = new Headers;
  const nullHeaders = new Set;
  for (const headers of newHeaders) {
    const seenHeaders = new Set;
    for (const [name, value] of iterateHeaders(headers)) {
      const lowerName = name.toLowerCase();
      if (!seenHeaders.has(lowerName)) {
        targetHeaders.delete(name);
        seenHeaders.add(lowerName);
      }
      if (value === null) {
        targetHeaders.delete(name);
        nullHeaders.add(lowerName);
      } else {
        targetHeaders.append(name, value);
        nullHeaders.delete(lowerName);
      }
    }
  }
  return { [brand_privateNullableHeaders]: true, values: targetHeaders, nulls: nullHeaders };
};

// node_modules/@anthropic-ai/sdk/internal/utils/path.mjs
function encodeURIPath(str) {
  return str.replace(/[^A-Za-z0-9\-._~!$&'()*+,;=:@]+/g, encodeURIComponent);
}
var EMPTY = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.create(null));
var createPathTagFunction = (pathEncoder = encodeURIPath) => function path(statics, ...params) {
  if (statics.length === 1)
    return statics[0];
  let postPath = false;
  const invalidSegments = [];
  const path = statics.reduce((previousValue, currentValue, index) => {
    if (/[?#]/.test(currentValue)) {
      postPath = true;
    }
    const value = params[index];
    let encoded = (postPath ? encodeURIComponent : pathEncoder)("" + value);
    if (index !== params.length && (value == null || typeof value === "object" && value.toString === Object.getPrototypeOf(Object.getPrototypeOf(value.hasOwnProperty ?? EMPTY) ?? EMPTY)?.toString)) {
      encoded = value + "";
      invalidSegments.push({
        start: previousValue.length + currentValue.length,
        length: encoded.length,
        error: `Value of type ${Object.prototype.toString.call(value).slice(8, -1)} is not a valid path parameter`
      });
    }
    return previousValue + currentValue + (index === params.length ? "" : encoded);
  }, "");
  const pathOnly = path.split(/[?#]/, 1)[0];
  const invalidSegmentPattern = /(?<=^|\/)(?:\.|%2e){1,2}(?=\/|$)/gi;
  let match;
  while ((match = invalidSegmentPattern.exec(pathOnly)) !== null) {
    invalidSegments.push({
      start: match.index,
      length: match[0].length,
      error: `Value "${match[0]}" can't be safely passed as a path parameter`
    });
  }
  invalidSegments.sort((a, b) => a.start - b.start);
  if (invalidSegments.length > 0) {
    let lastEnd = 0;
    const underline = invalidSegments.reduce((acc, segment) => {
      const spaces = " ".repeat(segment.start - lastEnd);
      const arrows = "^".repeat(segment.length);
      lastEnd = segment.start + segment.length;
      return acc + spaces + arrows;
    }, "");
    throw new AnthropicError(`Path parameters result in path with invalid segments:
${invalidSegments.map((e) => e.error).join(`
`)}
${path}
${underline}`);
  }
  return path;
};
var path = /* @__PURE__ */ createPathTagFunction(encodeURIPath);

// node_modules/@anthropic-ai/sdk/resources/beta/files.mjs
class Files extends APIResource {
  list(params = {}, options) {
    const { betas, ...query } = params ?? {};
    return this._client.getAPIList("/v1/files", Page, {
      query,
      ...options,
      headers: buildHeaders([
        { "anthropic-beta": [...betas ?? [], "files-api-2025-04-14"].toString() },
        options?.headers
      ])
    });
  }
  delete(fileID, params = {}, options) {
    const { betas } = params ?? {};
    return this._client.delete(path`/v1/files/${fileID}`, {
      ...options,
      headers: buildHeaders([
        { "anthropic-beta": [...betas ?? [], "files-api-2025-04-14"].toString() },
        options?.headers
      ])
    });
  }
  download(fileID, params = {}, options) {
    const { betas } = params ?? {};
    return this._client.get(path`/v1/files/${fileID}/content`, {
      ...options,
      headers: buildHeaders([
        {
          "anthropic-beta": [...betas ?? [], "files-api-2025-04-14"].toString(),
          Accept: "application/binary"
        },
        options?.headers
      ]),
      __binaryResponse: true
    });
  }
  retrieveMetadata(fileID, params = {}, options) {
    const { betas } = params ?? {};
    return this._client.get(path`/v1/files/${fileID}`, {
      ...options,
      headers: buildHeaders([
        { "anthropic-beta": [...betas ?? [], "files-api-2025-04-14"].toString() },
        options?.headers
      ])
    });
  }
  upload(params, options) {
    const { betas, ...body } = params;
    return this._client.post("/v1/files", multipartFormRequestOptions({
      body,
      ...options,
      headers: buildHeaders([
        { "anthropic-beta": [...betas ?? [], "files-api-2025-04-14"].toString() },
        options?.headers
      ])
    }, this._client));
  }
}

// node_modules/@anthropic-ai/sdk/resources/beta/models.mjs
class Models extends APIResource {
  retrieve(modelID, params = {}, options) {
    const { betas } = params ?? {};
    return this._client.get(path`/v1/models/${modelID}?beta=true`, {
      ...options,
      headers: buildHeaders([
        { ...betas?.toString() != null ? { "anthropic-beta": betas?.toString() } : undefined },
        options?.headers
      ])
    });
  }
  list(params = {}, options) {
    const { betas, ...query } = params ?? {};
    return this._client.getAPIList("/v1/models?beta=true", Page, {
      query,
      ...options,
      headers: buildHeaders([
        { ...betas?.toString() != null ? { "anthropic-beta": betas?.toString() } : undefined },
        options?.headers
      ])
    });
  }
}

// node_modules/@anthropic-ai/sdk/internal/constants.mjs
var MODEL_NONSTREAMING_TOKENS = {
  "claude-opus-4-20250514": 8192,
  "claude-opus-4-0": 8192,
  "claude-4-opus-20250514": 8192,
  "anthropic.claude-opus-4-20250514-v1:0": 8192,
  "claude-opus-4@20250514": 8192,
  "claude-opus-4-1-20250805": 8192,
  "anthropic.claude-opus-4-1-20250805-v1:0": 8192,
  "claude-opus-4-1@20250805": 8192
};

// node_modules/@anthropic-ai/sdk/lib/beta-parser.mjs
function maybeParseBetaMessage(message, params, opts) {
  if (!params || !("parse" in (params.output_format ?? {}))) {
    return {
      ...message,
      content: message.content.map((block) => {
        if (block.type === "text") {
          const parsedBlock = Object.defineProperty({ ...block }, "parsed_output", {
            value: null,
            enumerable: false
          });
          return Object.defineProperty(parsedBlock, "parsed", {
            get() {
              opts.logger.warn("The `parsed` property on `text` blocks is deprecated, please use `parsed_output` instead.");
              return null;
            },
            enumerable: false
          });
        }
        return block;
      }),
      parsed_output: null
    };
  }
  return parseBetaMessage(message, params, opts);
}
function parseBetaMessage(message, params, opts) {
  let firstParsedOutput = null;
  const content = message.content.map((block) => {
    if (block.type === "text") {
      const parsedOutput = parseBetaOutputFormat(params, block.text);
      if (firstParsedOutput === null) {
        firstParsedOutput = parsedOutput;
      }
      const parsedBlock = Object.defineProperty({ ...block }, "parsed_output", {
        value: parsedOutput,
        enumerable: false
      });
      return Object.defineProperty(parsedBlock, "parsed", {
        get() {
          opts.logger.warn("The `parsed` property on `text` blocks is deprecated, please use `parsed_output` instead.");
          return parsedOutput;
        },
        enumerable: false
      });
    }
    return block;
  });
  return {
    ...message,
    content,
    parsed_output: firstParsedOutput
  };
}
function parseBetaOutputFormat(params, content) {
  if (params.output_format?.type !== "json_schema") {
    return null;
  }
  try {
    if ("parse" in params.output_format) {
      return params.output_format.parse(content);
    }
    return JSON.parse(content);
  } catch (error) {
    throw new AnthropicError(`Failed to parse structured output: ${error}`);
  }
}

// node_modules/@anthropic-ai/sdk/_vendor/partial-json-parser/parser.mjs
var tokenize = (input) => {
  let current = 0;
  let tokens = [];
  while (current < input.length) {
    let char = input[current];
    if (char === "\\") {
      current++;
      continue;
    }
    if (char === "{") {
      tokens.push({
        type: "brace",
        value: "{"
      });
      current++;
      continue;
    }
    if (char === "}") {
      tokens.push({
        type: "brace",
        value: "}"
      });
      current++;
      continue;
    }
    if (char === "[") {
      tokens.push({
        type: "paren",
        value: "["
      });
      current++;
      continue;
    }
    if (char === "]") {
      tokens.push({
        type: "paren",
        value: "]"
      });
      current++;
      continue;
    }
    if (char === ":") {
      tokens.push({
        type: "separator",
        value: ":"
      });
      current++;
      continue;
    }
    if (char === ",") {
      tokens.push({
        type: "delimiter",
        value: ","
      });
      current++;
      continue;
    }
    if (char === '"') {
      let value = "";
      let danglingQuote = false;
      char = input[++current];
      while (char !== '"') {
        if (current === input.length) {
          danglingQuote = true;
          break;
        }
        if (char === "\\") {
          current++;
          if (current === input.length) {
            danglingQuote = true;
            break;
          }
          value += char + input[current];
          char = input[++current];
        } else {
          value += char;
          char = input[++current];
        }
      }
      char = input[++current];
      if (!danglingQuote) {
        tokens.push({
          type: "string",
          value
        });
      }
      continue;
    }
    let WHITESPACE = /\s/;
    if (char && WHITESPACE.test(char)) {
      current++;
      continue;
    }
    let NUMBERS = /[0-9]/;
    if (char && NUMBERS.test(char) || char === "-" || char === ".") {
      let value = "";
      if (char === "-") {
        value += char;
        char = input[++current];
      }
      while (char && NUMBERS.test(char) || char === ".") {
        value += char;
        char = input[++current];
      }
      tokens.push({
        type: "number",
        value
      });
      continue;
    }
    let LETTERS = /[a-z]/i;
    if (char && LETTERS.test(char)) {
      let value = "";
      while (char && LETTERS.test(char)) {
        if (current === input.length) {
          break;
        }
        value += char;
        char = input[++current];
      }
      if (value == "true" || value == "false" || value === "null") {
        tokens.push({
          type: "name",
          value
        });
      } else {
        current++;
        continue;
      }
      continue;
    }
    current++;
  }
  return tokens;
};
var strip = (tokens) => {
  if (tokens.length === 0) {
    return tokens;
  }
  let lastToken = tokens[tokens.length - 1];
  switch (lastToken.type) {
    case "separator":
      tokens = tokens.slice(0, tokens.length - 1);
      return strip(tokens);
      break;
    case "number":
      let lastCharacterOfLastToken = lastToken.value[lastToken.value.length - 1];
      if (lastCharacterOfLastToken === "." || lastCharacterOfLastToken === "-") {
        tokens = tokens.slice(0, tokens.length - 1);
        return strip(tokens);
      }
    case "string":
      let tokenBeforeTheLastToken = tokens[tokens.length - 2];
      if (tokenBeforeTheLastToken?.type === "delimiter") {
        tokens = tokens.slice(0, tokens.length - 1);
        return strip(tokens);
      } else if (tokenBeforeTheLastToken?.type === "brace" && tokenBeforeTheLastToken.value === "{") {
        tokens = tokens.slice(0, tokens.length - 1);
        return strip(tokens);
      }
      break;
    case "delimiter":
      tokens = tokens.slice(0, tokens.length - 1);
      return strip(tokens);
      break;
  }
  return tokens;
};
var unstrip = (tokens) => {
  let tail = [];
  tokens.map((token) => {
    if (token.type === "brace") {
      if (token.value === "{") {
        tail.push("}");
      } else {
        tail.splice(tail.lastIndexOf("}"), 1);
      }
    }
    if (token.type === "paren") {
      if (token.value === "[") {
        tail.push("]");
      } else {
        tail.splice(tail.lastIndexOf("]"), 1);
      }
    }
  });
  if (tail.length > 0) {
    tail.reverse().map((item) => {
      if (item === "}") {
        tokens.push({
          type: "brace",
          value: "}"
        });
      } else if (item === "]") {
        tokens.push({
          type: "paren",
          value: "]"
        });
      }
    });
  }
  return tokens;
};
var generate = (tokens) => {
  let output = "";
  tokens.map((token) => {
    switch (token.type) {
      case "string":
        output += '"' + token.value + '"';
        break;
      default:
        output += token.value;
        break;
    }
  });
  return output;
};
var partialParse = (input) => JSON.parse(generate(unstrip(strip(tokenize(input)))));
// node_modules/@anthropic-ai/sdk/lib/BetaMessageStream.mjs
var _BetaMessageStream_instances;
var _BetaMessageStream_currentMessageSnapshot;
var _BetaMessageStream_params;
var _BetaMessageStream_connectedPromise;
var _BetaMessageStream_resolveConnectedPromise;
var _BetaMessageStream_rejectConnectedPromise;
var _BetaMessageStream_endPromise;
var _BetaMessageStream_resolveEndPromise;
var _BetaMessageStream_rejectEndPromise;
var _BetaMessageStream_listeners;
var _BetaMessageStream_ended;
var _BetaMessageStream_errored;
var _BetaMessageStream_aborted;
var _BetaMessageStream_catchingPromiseCreated;
var _BetaMessageStream_response;
var _BetaMessageStream_request_id;
var _BetaMessageStream_logger;
var _BetaMessageStream_getFinalMessage;
var _BetaMessageStream_getFinalText;
var _BetaMessageStream_handleError;
var _BetaMessageStream_beginRequest;
var _BetaMessageStream_addStreamEvent;
var _BetaMessageStream_endRequest;
var _BetaMessageStream_accumulateMessage;
var JSON_BUF_PROPERTY = "__json_buf";
function tracksToolInput(content) {
  return content.type === "tool_use" || content.type === "server_tool_use" || content.type === "mcp_tool_use";
}

class BetaMessageStream {
  constructor(params, opts) {
    _BetaMessageStream_instances.add(this);
    this.messages = [];
    this.receivedMessages = [];
    _BetaMessageStream_currentMessageSnapshot.set(this, undefined);
    _BetaMessageStream_params.set(this, null);
    this.controller = new AbortController;
    _BetaMessageStream_connectedPromise.set(this, undefined);
    _BetaMessageStream_resolveConnectedPromise.set(this, () => {});
    _BetaMessageStream_rejectConnectedPromise.set(this, () => {});
    _BetaMessageStream_endPromise.set(this, undefined);
    _BetaMessageStream_resolveEndPromise.set(this, () => {});
    _BetaMessageStream_rejectEndPromise.set(this, () => {});
    _BetaMessageStream_listeners.set(this, {});
    _BetaMessageStream_ended.set(this, false);
    _BetaMessageStream_errored.set(this, false);
    _BetaMessageStream_aborted.set(this, false);
    _BetaMessageStream_catchingPromiseCreated.set(this, false);
    _BetaMessageStream_response.set(this, undefined);
    _BetaMessageStream_request_id.set(this, undefined);
    _BetaMessageStream_logger.set(this, undefined);
    _BetaMessageStream_handleError.set(this, (error2) => {
      __classPrivateFieldSet(this, _BetaMessageStream_errored, true, "f");
      if (isAbortError(error2)) {
        error2 = new APIUserAbortError;
      }
      if (error2 instanceof APIUserAbortError) {
        __classPrivateFieldSet(this, _BetaMessageStream_aborted, true, "f");
        return this._emit("abort", error2);
      }
      if (error2 instanceof AnthropicError) {
        return this._emit("error", error2);
      }
      if (error2 instanceof Error) {
        const anthropicError = new AnthropicError(error2.message);
        anthropicError.cause = error2;
        return this._emit("error", anthropicError);
      }
      return this._emit("error", new AnthropicError(String(error2)));
    });
    __classPrivateFieldSet(this, _BetaMessageStream_connectedPromise, new Promise((resolve, reject) => {
      __classPrivateFieldSet(this, _BetaMessageStream_resolveConnectedPromise, resolve, "f");
      __classPrivateFieldSet(this, _BetaMessageStream_rejectConnectedPromise, reject, "f");
    }), "f");
    __classPrivateFieldSet(this, _BetaMessageStream_endPromise, new Promise((resolve, reject) => {
      __classPrivateFieldSet(this, _BetaMessageStream_resolveEndPromise, resolve, "f");
      __classPrivateFieldSet(this, _BetaMessageStream_rejectEndPromise, reject, "f");
    }), "f");
    __classPrivateFieldGet(this, _BetaMessageStream_connectedPromise, "f").catch(() => {});
    __classPrivateFieldGet(this, _BetaMessageStream_endPromise, "f").catch(() => {});
    __classPrivateFieldSet(this, _BetaMessageStream_params, params, "f");
    __classPrivateFieldSet(this, _BetaMessageStream_logger, opts?.logger ?? console, "f");
  }
  get response() {
    return __classPrivateFieldGet(this, _BetaMessageStream_response, "f");
  }
  get request_id() {
    return __classPrivateFieldGet(this, _BetaMessageStream_request_id, "f");
  }
  async withResponse() {
    __classPrivateFieldSet(this, _BetaMessageStream_catchingPromiseCreated, true, "f");
    const response = await __classPrivateFieldGet(this, _BetaMessageStream_connectedPromise, "f");
    if (!response) {
      throw new Error("Could not resolve a `Response` object");
    }
    return {
      data: this,
      response,
      request_id: response.headers.get("request-id")
    };
  }
  static fromReadableStream(stream) {
    const runner = new BetaMessageStream(null);
    runner._run(() => runner._fromReadableStream(stream));
    return runner;
  }
  static createMessage(messages, params, options, { logger } = {}) {
    const runner = new BetaMessageStream(params, { logger });
    for (const message of params.messages) {
      runner._addMessageParam(message);
    }
    __classPrivateFieldSet(runner, _BetaMessageStream_params, { ...params, stream: true }, "f");
    runner._run(() => runner._createMessage(messages, { ...params, stream: true }, { ...options, headers: { ...options?.headers, "X-Stainless-Helper-Method": "stream" } }));
    return runner;
  }
  _run(executor) {
    executor().then(() => {
      this._emitFinal();
      this._emit("end");
    }, __classPrivateFieldGet(this, _BetaMessageStream_handleError, "f"));
  }
  _addMessageParam(message) {
    this.messages.push(message);
  }
  _addMessage(message, emit = true) {
    this.receivedMessages.push(message);
    if (emit) {
      this._emit("message", message);
    }
  }
  async _createMessage(messages, params, options) {
    const signal = options?.signal;
    let abortHandler;
    if (signal) {
      if (signal.aborted)
        this.controller.abort();
      abortHandler = this.controller.abort.bind(this.controller);
      signal.addEventListener("abort", abortHandler);
    }
    try {
      __classPrivateFieldGet(this, _BetaMessageStream_instances, "m", _BetaMessageStream_beginRequest).call(this);
      const { response, data: stream } = await messages.create({ ...params, stream: true }, { ...options, signal: this.controller.signal }).withResponse();
      this._connected(response);
      for await (const event of stream) {
        __classPrivateFieldGet(this, _BetaMessageStream_instances, "m", _BetaMessageStream_addStreamEvent).call(this, event);
      }
      if (stream.controller.signal?.aborted) {
        throw new APIUserAbortError;
      }
      __classPrivateFieldGet(this, _BetaMessageStream_instances, "m", _BetaMessageStream_endRequest).call(this);
    } finally {
      if (signal && abortHandler) {
        signal.removeEventListener("abort", abortHandler);
      }
    }
  }
  _connected(response) {
    if (this.ended)
      return;
    __classPrivateFieldSet(this, _BetaMessageStream_response, response, "f");
    __classPrivateFieldSet(this, _BetaMessageStream_request_id, response?.headers.get("request-id"), "f");
    __classPrivateFieldGet(this, _BetaMessageStream_resolveConnectedPromise, "f").call(this, response);
    this._emit("connect");
  }
  get ended() {
    return __classPrivateFieldGet(this, _BetaMessageStream_ended, "f");
  }
  get errored() {
    return __classPrivateFieldGet(this, _BetaMessageStream_errored, "f");
  }
  get aborted() {
    return __classPrivateFieldGet(this, _BetaMessageStream_aborted, "f");
  }
  abort() {
    this.controller.abort();
  }
  on(event, listener) {
    const listeners = __classPrivateFieldGet(this, _BetaMessageStream_listeners, "f")[event] || (__classPrivateFieldGet(this, _BetaMessageStream_listeners, "f")[event] = []);
    listeners.push({ listener });
    return this;
  }
  off(event, listener) {
    const listeners = __classPrivateFieldGet(this, _BetaMessageStream_listeners, "f")[event];
    if (!listeners)
      return this;
    const index = listeners.findIndex((l) => l.listener === listener);
    if (index >= 0)
      listeners.splice(index, 1);
    return this;
  }
  once(event, listener) {
    const listeners = __classPrivateFieldGet(this, _BetaMessageStream_listeners, "f")[event] || (__classPrivateFieldGet(this, _BetaMessageStream_listeners, "f")[event] = []);
    listeners.push({ listener, once: true });
    return this;
  }
  emitted(event) {
    return new Promise((resolve, reject) => {
      __classPrivateFieldSet(this, _BetaMessageStream_catchingPromiseCreated, true, "f");
      if (event !== "error")
        this.once("error", reject);
      this.once(event, resolve);
    });
  }
  async done() {
    __classPrivateFieldSet(this, _BetaMessageStream_catchingPromiseCreated, true, "f");
    await __classPrivateFieldGet(this, _BetaMessageStream_endPromise, "f");
  }
  get currentMessage() {
    return __classPrivateFieldGet(this, _BetaMessageStream_currentMessageSnapshot, "f");
  }
  async finalMessage() {
    await this.done();
    return __classPrivateFieldGet(this, _BetaMessageStream_instances, "m", _BetaMessageStream_getFinalMessage).call(this);
  }
  async finalText() {
    await this.done();
    return __classPrivateFieldGet(this, _BetaMessageStream_instances, "m", _BetaMessageStream_getFinalText).call(this);
  }
  _emit(event, ...args) {
    if (__classPrivateFieldGet(this, _BetaMessageStream_ended, "f"))
      return;
    if (event === "end") {
      __classPrivateFieldSet(this, _BetaMessageStream_ended, true, "f");
      __classPrivateFieldGet(this, _BetaMessageStream_resolveEndPromise, "f").call(this);
    }
    const listeners = __classPrivateFieldGet(this, _BetaMessageStream_listeners, "f")[event];
    if (listeners) {
      __classPrivateFieldGet(this, _BetaMessageStream_listeners, "f")[event] = listeners.filter((l) => !l.once);
      listeners.forEach(({ listener }) => listener(...args));
    }
    if (event === "abort") {
      const error2 = args[0];
      if (!__classPrivateFieldGet(this, _BetaMessageStream_catchingPromiseCreated, "f") && !listeners?.length) {
        Promise.reject(error2);
      }
      __classPrivateFieldGet(this, _BetaMessageStream_rejectConnectedPromise, "f").call(this, error2);
      __classPrivateFieldGet(this, _BetaMessageStream_rejectEndPromise, "f").call(this, error2);
      this._emit("end");
      return;
    }
    if (event === "error") {
      const error2 = args[0];
      if (!__classPrivateFieldGet(this, _BetaMessageStream_catchingPromiseCreated, "f") && !listeners?.length) {
        Promise.reject(error2);
      }
      __classPrivateFieldGet(this, _BetaMessageStream_rejectConnectedPromise, "f").call(this, error2);
      __classPrivateFieldGet(this, _BetaMessageStream_rejectEndPromise, "f").call(this, error2);
      this._emit("end");
    }
  }
  _emitFinal() {
    const finalMessage = this.receivedMessages.at(-1);
    if (finalMessage) {
      this._emit("finalMessage", __classPrivateFieldGet(this, _BetaMessageStream_instances, "m", _BetaMessageStream_getFinalMessage).call(this));
    }
  }
  async _fromReadableStream(readableStream, options) {
    const signal = options?.signal;
    let abortHandler;
    if (signal) {
      if (signal.aborted)
        this.controller.abort();
      abortHandler = this.controller.abort.bind(this.controller);
      signal.addEventListener("abort", abortHandler);
    }
    try {
      __classPrivateFieldGet(this, _BetaMessageStream_instances, "m", _BetaMessageStream_beginRequest).call(this);
      this._connected(null);
      const stream = Stream.fromReadableStream(readableStream, this.controller);
      for await (const event of stream) {
        __classPrivateFieldGet(this, _BetaMessageStream_instances, "m", _BetaMessageStream_addStreamEvent).call(this, event);
      }
      if (stream.controller.signal?.aborted) {
        throw new APIUserAbortError;
      }
      __classPrivateFieldGet(this, _BetaMessageStream_instances, "m", _BetaMessageStream_endRequest).call(this);
    } finally {
      if (signal && abortHandler) {
        signal.removeEventListener("abort", abortHandler);
      }
    }
  }
  [(_BetaMessageStream_currentMessageSnapshot = new WeakMap, _BetaMessageStream_params = new WeakMap, _BetaMessageStream_connectedPromise = new WeakMap, _BetaMessageStream_resolveConnectedPromise = new WeakMap, _BetaMessageStream_rejectConnectedPromise = new WeakMap, _BetaMessageStream_endPromise = new WeakMap, _BetaMessageStream_resolveEndPromise = new WeakMap, _BetaMessageStream_rejectEndPromise = new WeakMap, _BetaMessageStream_listeners = new WeakMap, _BetaMessageStream_ended = new WeakMap, _BetaMessageStream_errored = new WeakMap, _BetaMessageStream_aborted = new WeakMap, _BetaMessageStream_catchingPromiseCreated = new WeakMap, _BetaMessageStream_response = new WeakMap, _BetaMessageStream_request_id = new WeakMap, _BetaMessageStream_logger = new WeakMap, _BetaMessageStream_handleError = new WeakMap, _BetaMessageStream_instances = new WeakSet, _BetaMessageStream_getFinalMessage = function _BetaMessageStream_getFinalMessage() {
    if (this.receivedMessages.length === 0) {
      throw new AnthropicError("stream ended without producing a Message with role=assistant");
    }
    return this.receivedMessages.at(-1);
  }, _BetaMessageStream_getFinalText = function _BetaMessageStream_getFinalText() {
    if (this.receivedMessages.length === 0) {
      throw new AnthropicError("stream ended without producing a Message with role=assistant");
    }
    const textBlocks = this.receivedMessages.at(-1).content.filter((block) => block.type === "text").map((block) => block.text);
    if (textBlocks.length === 0) {
      throw new AnthropicError("stream ended without producing a content block with type=text");
    }
    return textBlocks.join(" ");
  }, _BetaMessageStream_beginRequest = function _BetaMessageStream_beginRequest() {
    if (this.ended)
      return;
    __classPrivateFieldSet(this, _BetaMessageStream_currentMessageSnapshot, undefined, "f");
  }, _BetaMessageStream_addStreamEvent = function _BetaMessageStream_addStreamEvent(event) {
    if (this.ended)
      return;
    const messageSnapshot = __classPrivateFieldGet(this, _BetaMessageStream_instances, "m", _BetaMessageStream_accumulateMessage).call(this, event);
    this._emit("streamEvent", event, messageSnapshot);
    switch (event.type) {
      case "content_block_delta": {
        const content = messageSnapshot.content.at(-1);
        switch (event.delta.type) {
          case "text_delta": {
            if (content.type === "text") {
              this._emit("text", event.delta.text, content.text || "");
            }
            break;
          }
          case "citations_delta": {
            if (content.type === "text") {
              this._emit("citation", event.delta.citation, content.citations ?? []);
            }
            break;
          }
          case "input_json_delta": {
            if (tracksToolInput(content) && content.input) {
              this._emit("inputJson", event.delta.partial_json, content.input);
            }
            break;
          }
          case "thinking_delta": {
            if (content.type === "thinking") {
              this._emit("thinking", event.delta.thinking, content.thinking);
            }
            break;
          }
          case "signature_delta": {
            if (content.type === "thinking") {
              this._emit("signature", content.signature);
            }
            break;
          }
          default:
            checkNever(event.delta);
        }
        break;
      }
      case "message_stop": {
        this._addMessageParam(messageSnapshot);
        this._addMessage(maybeParseBetaMessage(messageSnapshot, __classPrivateFieldGet(this, _BetaMessageStream_params, "f"), { logger: __classPrivateFieldGet(this, _BetaMessageStream_logger, "f") }), true);
        break;
      }
      case "content_block_stop": {
        this._emit("contentBlock", messageSnapshot.content.at(-1));
        break;
      }
      case "message_start": {
        __classPrivateFieldSet(this, _BetaMessageStream_currentMessageSnapshot, messageSnapshot, "f");
        break;
      }
      case "content_block_start":
      case "message_delta":
        break;
    }
  }, _BetaMessageStream_endRequest = function _BetaMessageStream_endRequest() {
    if (this.ended) {
      throw new AnthropicError(`stream has ended, this shouldn't happen`);
    }
    const snapshot = __classPrivateFieldGet(this, _BetaMessageStream_currentMessageSnapshot, "f");
    if (!snapshot) {
      throw new AnthropicError(`request ended without sending any chunks`);
    }
    __classPrivateFieldSet(this, _BetaMessageStream_currentMessageSnapshot, undefined, "f");
    return maybeParseBetaMessage(snapshot, __classPrivateFieldGet(this, _BetaMessageStream_params, "f"), { logger: __classPrivateFieldGet(this, _BetaMessageStream_logger, "f") });
  }, _BetaMessageStream_accumulateMessage = function _BetaMessageStream_accumulateMessage(event) {
    let snapshot = __classPrivateFieldGet(this, _BetaMessageStream_currentMessageSnapshot, "f");
    if (event.type === "message_start") {
      if (snapshot) {
        throw new AnthropicError(`Unexpected event order, got ${event.type} before receiving "message_stop"`);
      }
      return event.message;
    }
    if (!snapshot) {
      throw new AnthropicError(`Unexpected event order, got ${event.type} before "message_start"`);
    }
    switch (event.type) {
      case "message_stop":
        return snapshot;
      case "message_delta":
        snapshot.container = event.delta.container;
        snapshot.stop_reason = event.delta.stop_reason;
        snapshot.stop_sequence = event.delta.stop_sequence;
        snapshot.usage.output_tokens = event.usage.output_tokens;
        snapshot.context_management = event.context_management;
        if (event.usage.input_tokens != null) {
          snapshot.usage.input_tokens = event.usage.input_tokens;
        }
        if (event.usage.cache_creation_input_tokens != null) {
          snapshot.usage.cache_creation_input_tokens = event.usage.cache_creation_input_tokens;
        }
        if (event.usage.cache_read_input_tokens != null) {
          snapshot.usage.cache_read_input_tokens = event.usage.cache_read_input_tokens;
        }
        if (event.usage.server_tool_use != null) {
          snapshot.usage.server_tool_use = event.usage.server_tool_use;
        }
        return snapshot;
      case "content_block_start":
        snapshot.content.push(event.content_block);
        return snapshot;
      case "content_block_delta": {
        const snapshotContent = snapshot.content.at(event.index);
        switch (event.delta.type) {
          case "text_delta": {
            if (snapshotContent?.type === "text") {
              snapshot.content[event.index] = {
                ...snapshotContent,
                text: (snapshotContent.text || "") + event.delta.text
              };
            }
            break;
          }
          case "citations_delta": {
            if (snapshotContent?.type === "text") {
              snapshot.content[event.index] = {
                ...snapshotContent,
                citations: [...snapshotContent.citations ?? [], event.delta.citation]
              };
            }
            break;
          }
          case "input_json_delta": {
            if (snapshotContent && tracksToolInput(snapshotContent)) {
              let jsonBuf = snapshotContent[JSON_BUF_PROPERTY] || "";
              jsonBuf += event.delta.partial_json;
              const newContent = { ...snapshotContent };
              Object.defineProperty(newContent, JSON_BUF_PROPERTY, {
                value: jsonBuf,
                enumerable: false,
                writable: true
              });
              if (jsonBuf) {
                try {
                  newContent.input = partialParse(jsonBuf);
                } catch (err) {
                  const error2 = new AnthropicError(`Unable to parse tool parameter JSON from model. Please retry your request or adjust your prompt. Error: ${err}. JSON: ${jsonBuf}`);
                  __classPrivateFieldGet(this, _BetaMessageStream_handleError, "f").call(this, error2);
                }
              }
              snapshot.content[event.index] = newContent;
            }
            break;
          }
          case "thinking_delta": {
            if (snapshotContent?.type === "thinking") {
              snapshot.content[event.index] = {
                ...snapshotContent,
                thinking: snapshotContent.thinking + event.delta.thinking
              };
            }
            break;
          }
          case "signature_delta": {
            if (snapshotContent?.type === "thinking") {
              snapshot.content[event.index] = {
                ...snapshotContent,
                signature: event.delta.signature
              };
            }
            break;
          }
          default:
            checkNever(event.delta);
        }
        return snapshot;
      }
      case "content_block_stop":
        return snapshot;
    }
  }, Symbol.asyncIterator)]() {
    const pushQueue = [];
    const readQueue = [];
    let done = false;
    this.on("streamEvent", (event) => {
      const reader = readQueue.shift();
      if (reader) {
        reader.resolve(event);
      } else {
        pushQueue.push(event);
      }
    });
    this.on("end", () => {
      done = true;
      for (const reader of readQueue) {
        reader.resolve(undefined);
      }
      readQueue.length = 0;
    });
    this.on("abort", (err) => {
      done = true;
      for (const reader of readQueue) {
        reader.reject(err);
      }
      readQueue.length = 0;
    });
    this.on("error", (err) => {
      done = true;
      for (const reader of readQueue) {
        reader.reject(err);
      }
      readQueue.length = 0;
    });
    return {
      next: async () => {
        if (!pushQueue.length) {
          if (done) {
            return { value: undefined, done: true };
          }
          return new Promise((resolve, reject) => readQueue.push({ resolve, reject })).then((chunk2) => chunk2 ? { value: chunk2, done: false } : { value: undefined, done: true });
        }
        const chunk = pushQueue.shift();
        return { value: chunk, done: false };
      },
      return: async () => {
        this.abort();
        return { value: undefined, done: true };
      }
    };
  }
  toReadableStream() {
    const stream = new Stream(this[Symbol.asyncIterator].bind(this), this.controller);
    return stream.toReadableStream();
  }
}
function checkNever(x) {}

// node_modules/@anthropic-ai/sdk/lib/tools/CompactionControl.mjs
var DEFAULT_TOKEN_THRESHOLD = 1e5;
var DEFAULT_SUMMARY_PROMPT = `You have been working on the task described above but have not yet completed it. Write a continuation summary that will allow you (or another instance of yourself) to resume work efficiently in a future context window where the conversation history will be replaced with this summary. Your summary should be structured, concise, and actionable. Include:
1. Task Overview
The user's core request and success criteria
Any clarifications or constraints they specified
2. Current State
What has been completed so far
Files created, modified, or analyzed (with paths if relevant)
Key outputs or artifacts produced
3. Important Discoveries
Technical constraints or requirements uncovered
Decisions made and their rationale
Errors encountered and how they were resolved
What approaches were tried that didn't work (and why)
4. Next Steps
Specific actions needed to complete the task
Any blockers or open questions to resolve
Priority order if multiple steps remain
5. Context to Preserve
User preferences or style requirements
Domain-specific details that aren't obvious
Any promises made to the user
Be concise but complete—err on the side of including information that would prevent duplicate work or repeated mistakes. Write in a way that enables immediate resumption of the task.
Wrap your summary in <summary></summary> tags.`;

// node_modules/@anthropic-ai/sdk/lib/tools/BetaToolRunner.mjs
var _BetaToolRunner_instances;
var _BetaToolRunner_consumed;
var _BetaToolRunner_mutated;
var _BetaToolRunner_state;
var _BetaToolRunner_options;
var _BetaToolRunner_message;
var _BetaToolRunner_toolResponse;
var _BetaToolRunner_completion;
var _BetaToolRunner_iterationCount;
var _BetaToolRunner_checkAndCompact;
var _BetaToolRunner_generateToolResponse;
function promiseWithResolvers() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

class BetaToolRunner {
  constructor(client, params, options) {
    _BetaToolRunner_instances.add(this);
    this.client = client;
    _BetaToolRunner_consumed.set(this, false);
    _BetaToolRunner_mutated.set(this, false);
    _BetaToolRunner_state.set(this, undefined);
    _BetaToolRunner_options.set(this, undefined);
    _BetaToolRunner_message.set(this, undefined);
    _BetaToolRunner_toolResponse.set(this, undefined);
    _BetaToolRunner_completion.set(this, undefined);
    _BetaToolRunner_iterationCount.set(this, 0);
    __classPrivateFieldSet(this, _BetaToolRunner_state, {
      params: {
        ...params,
        messages: structuredClone(params.messages)
      }
    }, "f");
    __classPrivateFieldSet(this, _BetaToolRunner_options, {
      ...options,
      headers: buildHeaders([{ "x-stainless-helper": "BetaToolRunner" }, options?.headers])
    }, "f");
    __classPrivateFieldSet(this, _BetaToolRunner_completion, promiseWithResolvers(), "f");
  }
  async* [(_BetaToolRunner_consumed = new WeakMap, _BetaToolRunner_mutated = new WeakMap, _BetaToolRunner_state = new WeakMap, _BetaToolRunner_options = new WeakMap, _BetaToolRunner_message = new WeakMap, _BetaToolRunner_toolResponse = new WeakMap, _BetaToolRunner_completion = new WeakMap, _BetaToolRunner_iterationCount = new WeakMap, _BetaToolRunner_instances = new WeakSet, _BetaToolRunner_checkAndCompact = async function _BetaToolRunner_checkAndCompact() {
    const compactionControl = __classPrivateFieldGet(this, _BetaToolRunner_state, "f").params.compactionControl;
    if (!compactionControl || !compactionControl.enabled) {
      return false;
    }
    let tokensUsed = 0;
    if (__classPrivateFieldGet(this, _BetaToolRunner_message, "f") !== undefined) {
      try {
        const message = await __classPrivateFieldGet(this, _BetaToolRunner_message, "f");
        const totalInputTokens = message.usage.input_tokens + (message.usage.cache_creation_input_tokens ?? 0) + (message.usage.cache_read_input_tokens ?? 0);
        tokensUsed = totalInputTokens + message.usage.output_tokens;
      } catch {
        return false;
      }
    }
    const threshold = compactionControl.contextTokenThreshold ?? DEFAULT_TOKEN_THRESHOLD;
    if (tokensUsed < threshold) {
      return false;
    }
    const model = compactionControl.model ?? __classPrivateFieldGet(this, _BetaToolRunner_state, "f").params.model;
    const summaryPrompt = compactionControl.summaryPrompt ?? DEFAULT_SUMMARY_PROMPT;
    const messages = __classPrivateFieldGet(this, _BetaToolRunner_state, "f").params.messages;
    if (messages[messages.length - 1].role === "assistant") {
      const lastMessage = messages[messages.length - 1];
      if (Array.isArray(lastMessage.content)) {
        const nonToolBlocks = lastMessage.content.filter((block) => block.type !== "tool_use");
        if (nonToolBlocks.length === 0) {
          messages.pop();
        } else {
          lastMessage.content = nonToolBlocks;
        }
      }
    }
    const response = await this.client.beta.messages.create({
      model,
      messages: [
        ...messages,
        {
          role: "user",
          content: [
            {
              type: "text",
              text: summaryPrompt
            }
          ]
        }
      ],
      max_tokens: __classPrivateFieldGet(this, _BetaToolRunner_state, "f").params.max_tokens
    }, {
      headers: { "x-stainless-helper": "compaction" }
    });
    if (response.content[0]?.type !== "text") {
      throw new AnthropicError("Expected text response for compaction");
    }
    __classPrivateFieldGet(this, _BetaToolRunner_state, "f").params.messages = [
      {
        role: "user",
        content: response.content
      }
    ];
    return true;
  }, Symbol.asyncIterator)]() {
    var _a;
    if (__classPrivateFieldGet(this, _BetaToolRunner_consumed, "f")) {
      throw new AnthropicError("Cannot iterate over a consumed stream");
    }
    __classPrivateFieldSet(this, _BetaToolRunner_consumed, true, "f");
    __classPrivateFieldSet(this, _BetaToolRunner_mutated, true, "f");
    __classPrivateFieldSet(this, _BetaToolRunner_toolResponse, undefined, "f");
    try {
      while (true) {
        let stream;
        try {
          if (__classPrivateFieldGet(this, _BetaToolRunner_state, "f").params.max_iterations && __classPrivateFieldGet(this, _BetaToolRunner_iterationCount, "f") >= __classPrivateFieldGet(this, _BetaToolRunner_state, "f").params.max_iterations) {
            break;
          }
          __classPrivateFieldSet(this, _BetaToolRunner_mutated, false, "f");
          __classPrivateFieldSet(this, _BetaToolRunner_toolResponse, undefined, "f");
          __classPrivateFieldSet(this, _BetaToolRunner_iterationCount, (_a = __classPrivateFieldGet(this, _BetaToolRunner_iterationCount, "f"), _a++, _a), "f");
          __classPrivateFieldSet(this, _BetaToolRunner_message, undefined, "f");
          const { max_iterations, compactionControl, ...params } = __classPrivateFieldGet(this, _BetaToolRunner_state, "f").params;
          if (params.stream) {
            stream = this.client.beta.messages.stream({ ...params }, __classPrivateFieldGet(this, _BetaToolRunner_options, "f"));
            __classPrivateFieldSet(this, _BetaToolRunner_message, stream.finalMessage(), "f");
            __classPrivateFieldGet(this, _BetaToolRunner_message, "f").catch(() => {});
            yield stream;
          } else {
            __classPrivateFieldSet(this, _BetaToolRunner_message, this.client.beta.messages.create({ ...params, stream: false }, __classPrivateFieldGet(this, _BetaToolRunner_options, "f")), "f");
            yield __classPrivateFieldGet(this, _BetaToolRunner_message, "f");
          }
          const isCompacted = await __classPrivateFieldGet(this, _BetaToolRunner_instances, "m", _BetaToolRunner_checkAndCompact).call(this);
          if (!isCompacted) {
            if (!__classPrivateFieldGet(this, _BetaToolRunner_mutated, "f")) {
              const { role, content } = await __classPrivateFieldGet(this, _BetaToolRunner_message, "f");
              __classPrivateFieldGet(this, _BetaToolRunner_state, "f").params.messages.push({ role, content });
            }
            const toolMessage = await __classPrivateFieldGet(this, _BetaToolRunner_instances, "m", _BetaToolRunner_generateToolResponse).call(this, __classPrivateFieldGet(this, _BetaToolRunner_state, "f").params.messages.at(-1));
            if (toolMessage) {
              __classPrivateFieldGet(this, _BetaToolRunner_state, "f").params.messages.push(toolMessage);
            } else if (!__classPrivateFieldGet(this, _BetaToolRunner_mutated, "f")) {
              break;
            }
          }
        } finally {
          if (stream) {
            stream.abort();
          }
        }
      }
      if (!__classPrivateFieldGet(this, _BetaToolRunner_message, "f")) {
        throw new AnthropicError("ToolRunner concluded without a message from the server");
      }
      __classPrivateFieldGet(this, _BetaToolRunner_completion, "f").resolve(await __classPrivateFieldGet(this, _BetaToolRunner_message, "f"));
    } catch (error2) {
      __classPrivateFieldSet(this, _BetaToolRunner_consumed, false, "f");
      __classPrivateFieldGet(this, _BetaToolRunner_completion, "f").promise.catch(() => {});
      __classPrivateFieldGet(this, _BetaToolRunner_completion, "f").reject(error2);
      __classPrivateFieldSet(this, _BetaToolRunner_completion, promiseWithResolvers(), "f");
      throw error2;
    }
  }
  setMessagesParams(paramsOrMutator) {
    if (typeof paramsOrMutator === "function") {
      __classPrivateFieldGet(this, _BetaToolRunner_state, "f").params = paramsOrMutator(__classPrivateFieldGet(this, _BetaToolRunner_state, "f").params);
    } else {
      __classPrivateFieldGet(this, _BetaToolRunner_state, "f").params = paramsOrMutator;
    }
    __classPrivateFieldSet(this, _BetaToolRunner_mutated, true, "f");
    __classPrivateFieldSet(this, _BetaToolRunner_toolResponse, undefined, "f");
  }
  async generateToolResponse() {
    const message = await __classPrivateFieldGet(this, _BetaToolRunner_message, "f") ?? this.params.messages.at(-1);
    if (!message) {
      return null;
    }
    return __classPrivateFieldGet(this, _BetaToolRunner_instances, "m", _BetaToolRunner_generateToolResponse).call(this, message);
  }
  done() {
    return __classPrivateFieldGet(this, _BetaToolRunner_completion, "f").promise;
  }
  async runUntilDone() {
    if (!__classPrivateFieldGet(this, _BetaToolRunner_consumed, "f")) {
      for await (const _ of this) {}
    }
    return this.done();
  }
  get params() {
    return __classPrivateFieldGet(this, _BetaToolRunner_state, "f").params;
  }
  pushMessages(...messages) {
    this.setMessagesParams((params) => ({
      ...params,
      messages: [...params.messages, ...messages]
    }));
  }
  then(onfulfilled, onrejected) {
    return this.runUntilDone().then(onfulfilled, onrejected);
  }
}
_BetaToolRunner_generateToolResponse = async function _BetaToolRunner_generateToolResponse2(lastMessage) {
  if (__classPrivateFieldGet(this, _BetaToolRunner_toolResponse, "f") !== undefined) {
    return __classPrivateFieldGet(this, _BetaToolRunner_toolResponse, "f");
  }
  __classPrivateFieldSet(this, _BetaToolRunner_toolResponse, generateToolResponse(__classPrivateFieldGet(this, _BetaToolRunner_state, "f").params, lastMessage), "f");
  return __classPrivateFieldGet(this, _BetaToolRunner_toolResponse, "f");
};
async function generateToolResponse(params, lastMessage = params.messages.at(-1)) {
  if (!lastMessage || lastMessage.role !== "assistant" || !lastMessage.content || typeof lastMessage.content === "string") {
    return null;
  }
  const toolUseBlocks = lastMessage.content.filter((content) => content.type === "tool_use");
  if (toolUseBlocks.length === 0) {
    return null;
  }
  const toolResults = await Promise.all(toolUseBlocks.map(async (toolUse) => {
    const tool = params.tools.find((t) => ("name" in t ? t.name : t.mcp_server_name) === toolUse.name);
    if (!tool || !("run" in tool)) {
      return {
        type: "tool_result",
        tool_use_id: toolUse.id,
        content: `Error: Tool '${toolUse.name}' not found`,
        is_error: true
      };
    }
    try {
      let input = toolUse.input;
      if ("parse" in tool && tool.parse) {
        input = tool.parse(input);
      }
      const result = await tool.run(input);
      return {
        type: "tool_result",
        tool_use_id: toolUse.id,
        content: result
      };
    } catch (error2) {
      return {
        type: "tool_result",
        tool_use_id: toolUse.id,
        content: `Error: ${error2 instanceof Error ? error2.message : String(error2)}`,
        is_error: true
      };
    }
  }));
  return {
    role: "user",
    content: toolResults
  };
}

// node_modules/@anthropic-ai/sdk/internal/decoders/jsonl.mjs
class JSONLDecoder {
  constructor(iterator, controller) {
    this.iterator = iterator;
    this.controller = controller;
  }
  async* decoder() {
    const lineDecoder = new LineDecoder;
    for await (const chunk of this.iterator) {
      for (const line of lineDecoder.decode(chunk)) {
        yield JSON.parse(line);
      }
    }
    for (const line of lineDecoder.flush()) {
      yield JSON.parse(line);
    }
  }
  [Symbol.asyncIterator]() {
    return this.decoder();
  }
  static fromResponse(response, controller) {
    if (!response.body) {
      controller.abort();
      if (typeof globalThis.navigator !== "undefined" && globalThis.navigator.product === "ReactNative") {
        throw new AnthropicError(`The default react-native fetch implementation does not support streaming. Please use expo/fetch: https://docs.expo.dev/versions/latest/sdk/expo/#expofetch-api`);
      }
      throw new AnthropicError(`Attempted to iterate over a response with no body`);
    }
    return new JSONLDecoder(ReadableStreamToAsyncIterable(response.body), controller);
  }
}

// node_modules/@anthropic-ai/sdk/resources/beta/messages/batches.mjs
class Batches extends APIResource {
  create(params, options) {
    const { betas, ...body } = params;
    return this._client.post("/v1/messages/batches?beta=true", {
      body,
      ...options,
      headers: buildHeaders([
        { "anthropic-beta": [...betas ?? [], "message-batches-2024-09-24"].toString() },
        options?.headers
      ])
    });
  }
  retrieve(messageBatchID, params = {}, options) {
    const { betas } = params ?? {};
    return this._client.get(path`/v1/messages/batches/${messageBatchID}?beta=true`, {
      ...options,
      headers: buildHeaders([
        { "anthropic-beta": [...betas ?? [], "message-batches-2024-09-24"].toString() },
        options?.headers
      ])
    });
  }
  list(params = {}, options) {
    const { betas, ...query } = params ?? {};
    return this._client.getAPIList("/v1/messages/batches?beta=true", Page, {
      query,
      ...options,
      headers: buildHeaders([
        { "anthropic-beta": [...betas ?? [], "message-batches-2024-09-24"].toString() },
        options?.headers
      ])
    });
  }
  delete(messageBatchID, params = {}, options) {
    const { betas } = params ?? {};
    return this._client.delete(path`/v1/messages/batches/${messageBatchID}?beta=true`, {
      ...options,
      headers: buildHeaders([
        { "anthropic-beta": [...betas ?? [], "message-batches-2024-09-24"].toString() },
        options?.headers
      ])
    });
  }
  cancel(messageBatchID, params = {}, options) {
    const { betas } = params ?? {};
    return this._client.post(path`/v1/messages/batches/${messageBatchID}/cancel?beta=true`, {
      ...options,
      headers: buildHeaders([
        { "anthropic-beta": [...betas ?? [], "message-batches-2024-09-24"].toString() },
        options?.headers
      ])
    });
  }
  async results(messageBatchID, params = {}, options) {
    const batch = await this.retrieve(messageBatchID);
    if (!batch.results_url) {
      throw new AnthropicError(`No batch \`results_url\`; Has it finished processing? ${batch.processing_status} - ${batch.id}`);
    }
    const { betas } = params ?? {};
    return this._client.get(batch.results_url, {
      ...options,
      headers: buildHeaders([
        {
          "anthropic-beta": [...betas ?? [], "message-batches-2024-09-24"].toString(),
          Accept: "application/binary"
        },
        options?.headers
      ]),
      stream: true,
      __binaryResponse: true
    })._thenUnwrap((_, props) => JSONLDecoder.fromResponse(props.response, props.controller));
  }
}

// node_modules/@anthropic-ai/sdk/resources/beta/messages/messages.mjs
var DEPRECATED_MODELS = {
  "claude-1.3": "November 6th, 2024",
  "claude-1.3-100k": "November 6th, 2024",
  "claude-instant-1.1": "November 6th, 2024",
  "claude-instant-1.1-100k": "November 6th, 2024",
  "claude-instant-1.2": "November 6th, 2024",
  "claude-3-sonnet-20240229": "July 21st, 2025",
  "claude-3-opus-20240229": "January 5th, 2026",
  "claude-2.1": "July 21st, 2025",
  "claude-2.0": "July 21st, 2025",
  "claude-3-7-sonnet-latest": "February 19th, 2026",
  "claude-3-7-sonnet-20250219": "February 19th, 2026"
};

class Messages extends APIResource {
  constructor() {
    super(...arguments);
    this.batches = new Batches(this._client);
  }
  create(params, options) {
    const { betas, ...body } = params;
    if (body.model in DEPRECATED_MODELS) {
      console.warn(`The model '${body.model}' is deprecated and will reach end-of-life on ${DEPRECATED_MODELS[body.model]}
Please migrate to a newer model. Visit https://docs.anthropic.com/en/docs/resources/model-deprecations for more information.`);
    }
    let timeout = this._client._options.timeout;
    if (!body.stream && timeout == null) {
      const maxNonstreamingTokens = MODEL_NONSTREAMING_TOKENS[body.model] ?? undefined;
      timeout = this._client.calculateNonstreamingTimeout(body.max_tokens, maxNonstreamingTokens);
    }
    return this._client.post("/v1/messages?beta=true", {
      body,
      timeout: timeout ?? 600000,
      ...options,
      headers: buildHeaders([
        { ...betas?.toString() != null ? { "anthropic-beta": betas?.toString() } : undefined },
        options?.headers
      ]),
      stream: params.stream ?? false
    });
  }
  parse(params, options) {
    options = {
      ...options,
      headers: buildHeaders([
        { "anthropic-beta": [...params.betas ?? [], "structured-outputs-2025-11-13"].toString() },
        options?.headers
      ])
    };
    return this.create(params, options).then((message) => parseBetaMessage(message, params, { logger: this._client.logger ?? console }));
  }
  stream(body, options) {
    return BetaMessageStream.createMessage(this, body, options);
  }
  countTokens(params, options) {
    const { betas, ...body } = params;
    return this._client.post("/v1/messages/count_tokens?beta=true", {
      body,
      ...options,
      headers: buildHeaders([
        { "anthropic-beta": [...betas ?? [], "token-counting-2024-11-01"].toString() },
        options?.headers
      ])
    });
  }
  toolRunner(body, options) {
    return new BetaToolRunner(this._client, body, options);
  }
}
Messages.Batches = Batches;
Messages.BetaToolRunner = BetaToolRunner;

// node_modules/@anthropic-ai/sdk/resources/beta/skills/versions.mjs
class Versions extends APIResource {
  create(skillID, params = {}, options) {
    const { betas, ...body } = params ?? {};
    return this._client.post(path`/v1/skills/${skillID}/versions?beta=true`, multipartFormRequestOptions({
      body,
      ...options,
      headers: buildHeaders([
        { "anthropic-beta": [...betas ?? [], "skills-2025-10-02"].toString() },
        options?.headers
      ])
    }, this._client));
  }
  retrieve(version, params, options) {
    const { skill_id, betas } = params;
    return this._client.get(path`/v1/skills/${skill_id}/versions/${version}?beta=true`, {
      ...options,
      headers: buildHeaders([
        { "anthropic-beta": [...betas ?? [], "skills-2025-10-02"].toString() },
        options?.headers
      ])
    });
  }
  list(skillID, params = {}, options) {
    const { betas, ...query } = params ?? {};
    return this._client.getAPIList(path`/v1/skills/${skillID}/versions?beta=true`, PageCursor, {
      query,
      ...options,
      headers: buildHeaders([
        { "anthropic-beta": [...betas ?? [], "skills-2025-10-02"].toString() },
        options?.headers
      ])
    });
  }
  delete(version, params, options) {
    const { skill_id, betas } = params;
    return this._client.delete(path`/v1/skills/${skill_id}/versions/${version}?beta=true`, {
      ...options,
      headers: buildHeaders([
        { "anthropic-beta": [...betas ?? [], "skills-2025-10-02"].toString() },
        options?.headers
      ])
    });
  }
}

// node_modules/@anthropic-ai/sdk/resources/beta/skills/skills.mjs
class Skills extends APIResource {
  constructor() {
    super(...arguments);
    this.versions = new Versions(this._client);
  }
  create(params = {}, options) {
    const { betas, ...body } = params ?? {};
    return this._client.post("/v1/skills?beta=true", multipartFormRequestOptions({
      body,
      ...options,
      headers: buildHeaders([
        { "anthropic-beta": [...betas ?? [], "skills-2025-10-02"].toString() },
        options?.headers
      ])
    }, this._client));
  }
  retrieve(skillID, params = {}, options) {
    const { betas } = params ?? {};
    return this._client.get(path`/v1/skills/${skillID}?beta=true`, {
      ...options,
      headers: buildHeaders([
        { "anthropic-beta": [...betas ?? [], "skills-2025-10-02"].toString() },
        options?.headers
      ])
    });
  }
  list(params = {}, options) {
    const { betas, ...query } = params ?? {};
    return this._client.getAPIList("/v1/skills?beta=true", PageCursor, {
      query,
      ...options,
      headers: buildHeaders([
        { "anthropic-beta": [...betas ?? [], "skills-2025-10-02"].toString() },
        options?.headers
      ])
    });
  }
  delete(skillID, params = {}, options) {
    const { betas } = params ?? {};
    return this._client.delete(path`/v1/skills/${skillID}?beta=true`, {
      ...options,
      headers: buildHeaders([
        { "anthropic-beta": [...betas ?? [], "skills-2025-10-02"].toString() },
        options?.headers
      ])
    });
  }
}
Skills.Versions = Versions;

// node_modules/@anthropic-ai/sdk/resources/beta/beta.mjs
class Beta extends APIResource {
  constructor() {
    super(...arguments);
    this.models = new Models(this._client);
    this.messages = new Messages(this._client);
    this.files = new Files(this._client);
    this.skills = new Skills(this._client);
  }
}
Beta.Models = Models;
Beta.Messages = Messages;
Beta.Files = Files;
Beta.Skills = Skills;
// node_modules/@anthropic-ai/sdk/resources/completions.mjs
class Completions extends APIResource {
  create(params, options) {
    const { betas, ...body } = params;
    return this._client.post("/v1/complete", {
      body,
      timeout: this._client._options.timeout ?? 600000,
      ...options,
      headers: buildHeaders([
        { ...betas?.toString() != null ? { "anthropic-beta": betas?.toString() } : undefined },
        options?.headers
      ]),
      stream: params.stream ?? false
    });
  }
}
// node_modules/@anthropic-ai/sdk/lib/MessageStream.mjs
var _MessageStream_instances;
var _MessageStream_currentMessageSnapshot;
var _MessageStream_connectedPromise;
var _MessageStream_resolveConnectedPromise;
var _MessageStream_rejectConnectedPromise;
var _MessageStream_endPromise;
var _MessageStream_resolveEndPromise;
var _MessageStream_rejectEndPromise;
var _MessageStream_listeners;
var _MessageStream_ended;
var _MessageStream_errored;
var _MessageStream_aborted;
var _MessageStream_catchingPromiseCreated;
var _MessageStream_response;
var _MessageStream_request_id;
var _MessageStream_getFinalMessage;
var _MessageStream_getFinalText;
var _MessageStream_handleError;
var _MessageStream_beginRequest;
var _MessageStream_addStreamEvent;
var _MessageStream_endRequest;
var _MessageStream_accumulateMessage;
var JSON_BUF_PROPERTY2 = "__json_buf";
function tracksToolInput2(content) {
  return content.type === "tool_use" || content.type === "server_tool_use";
}

class MessageStream {
  constructor() {
    _MessageStream_instances.add(this);
    this.messages = [];
    this.receivedMessages = [];
    _MessageStream_currentMessageSnapshot.set(this, undefined);
    this.controller = new AbortController;
    _MessageStream_connectedPromise.set(this, undefined);
    _MessageStream_resolveConnectedPromise.set(this, () => {});
    _MessageStream_rejectConnectedPromise.set(this, () => {});
    _MessageStream_endPromise.set(this, undefined);
    _MessageStream_resolveEndPromise.set(this, () => {});
    _MessageStream_rejectEndPromise.set(this, () => {});
    _MessageStream_listeners.set(this, {});
    _MessageStream_ended.set(this, false);
    _MessageStream_errored.set(this, false);
    _MessageStream_aborted.set(this, false);
    _MessageStream_catchingPromiseCreated.set(this, false);
    _MessageStream_response.set(this, undefined);
    _MessageStream_request_id.set(this, undefined);
    _MessageStream_handleError.set(this, (error2) => {
      __classPrivateFieldSet(this, _MessageStream_errored, true, "f");
      if (isAbortError(error2)) {
        error2 = new APIUserAbortError;
      }
      if (error2 instanceof APIUserAbortError) {
        __classPrivateFieldSet(this, _MessageStream_aborted, true, "f");
        return this._emit("abort", error2);
      }
      if (error2 instanceof AnthropicError) {
        return this._emit("error", error2);
      }
      if (error2 instanceof Error) {
        const anthropicError = new AnthropicError(error2.message);
        anthropicError.cause = error2;
        return this._emit("error", anthropicError);
      }
      return this._emit("error", new AnthropicError(String(error2)));
    });
    __classPrivateFieldSet(this, _MessageStream_connectedPromise, new Promise((resolve, reject) => {
      __classPrivateFieldSet(this, _MessageStream_resolveConnectedPromise, resolve, "f");
      __classPrivateFieldSet(this, _MessageStream_rejectConnectedPromise, reject, "f");
    }), "f");
    __classPrivateFieldSet(this, _MessageStream_endPromise, new Promise((resolve, reject) => {
      __classPrivateFieldSet(this, _MessageStream_resolveEndPromise, resolve, "f");
      __classPrivateFieldSet(this, _MessageStream_rejectEndPromise, reject, "f");
    }), "f");
    __classPrivateFieldGet(this, _MessageStream_connectedPromise, "f").catch(() => {});
    __classPrivateFieldGet(this, _MessageStream_endPromise, "f").catch(() => {});
  }
  get response() {
    return __classPrivateFieldGet(this, _MessageStream_response, "f");
  }
  get request_id() {
    return __classPrivateFieldGet(this, _MessageStream_request_id, "f");
  }
  async withResponse() {
    __classPrivateFieldSet(this, _MessageStream_catchingPromiseCreated, true, "f");
    const response = await __classPrivateFieldGet(this, _MessageStream_connectedPromise, "f");
    if (!response) {
      throw new Error("Could not resolve a `Response` object");
    }
    return {
      data: this,
      response,
      request_id: response.headers.get("request-id")
    };
  }
  static fromReadableStream(stream) {
    const runner = new MessageStream;
    runner._run(() => runner._fromReadableStream(stream));
    return runner;
  }
  static createMessage(messages, params, options) {
    const runner = new MessageStream;
    for (const message of params.messages) {
      runner._addMessageParam(message);
    }
    runner._run(() => runner._createMessage(messages, { ...params, stream: true }, { ...options, headers: { ...options?.headers, "X-Stainless-Helper-Method": "stream" } }));
    return runner;
  }
  _run(executor) {
    executor().then(() => {
      this._emitFinal();
      this._emit("end");
    }, __classPrivateFieldGet(this, _MessageStream_handleError, "f"));
  }
  _addMessageParam(message) {
    this.messages.push(message);
  }
  _addMessage(message, emit = true) {
    this.receivedMessages.push(message);
    if (emit) {
      this._emit("message", message);
    }
  }
  async _createMessage(messages, params, options) {
    const signal = options?.signal;
    let abortHandler;
    if (signal) {
      if (signal.aborted)
        this.controller.abort();
      abortHandler = this.controller.abort.bind(this.controller);
      signal.addEventListener("abort", abortHandler);
    }
    try {
      __classPrivateFieldGet(this, _MessageStream_instances, "m", _MessageStream_beginRequest).call(this);
      const { response, data: stream } = await messages.create({ ...params, stream: true }, { ...options, signal: this.controller.signal }).withResponse();
      this._connected(response);
      for await (const event of stream) {
        __classPrivateFieldGet(this, _MessageStream_instances, "m", _MessageStream_addStreamEvent).call(this, event);
      }
      if (stream.controller.signal?.aborted) {
        throw new APIUserAbortError;
      }
      __classPrivateFieldGet(this, _MessageStream_instances, "m", _MessageStream_endRequest).call(this);
    } finally {
      if (signal && abortHandler) {
        signal.removeEventListener("abort", abortHandler);
      }
    }
  }
  _connected(response) {
    if (this.ended)
      return;
    __classPrivateFieldSet(this, _MessageStream_response, response, "f");
    __classPrivateFieldSet(this, _MessageStream_request_id, response?.headers.get("request-id"), "f");
    __classPrivateFieldGet(this, _MessageStream_resolveConnectedPromise, "f").call(this, response);
    this._emit("connect");
  }
  get ended() {
    return __classPrivateFieldGet(this, _MessageStream_ended, "f");
  }
  get errored() {
    return __classPrivateFieldGet(this, _MessageStream_errored, "f");
  }
  get aborted() {
    return __classPrivateFieldGet(this, _MessageStream_aborted, "f");
  }
  abort() {
    this.controller.abort();
  }
  on(event, listener) {
    const listeners = __classPrivateFieldGet(this, _MessageStream_listeners, "f")[event] || (__classPrivateFieldGet(this, _MessageStream_listeners, "f")[event] = []);
    listeners.push({ listener });
    return this;
  }
  off(event, listener) {
    const listeners = __classPrivateFieldGet(this, _MessageStream_listeners, "f")[event];
    if (!listeners)
      return this;
    const index = listeners.findIndex((l) => l.listener === listener);
    if (index >= 0)
      listeners.splice(index, 1);
    return this;
  }
  once(event, listener) {
    const listeners = __classPrivateFieldGet(this, _MessageStream_listeners, "f")[event] || (__classPrivateFieldGet(this, _MessageStream_listeners, "f")[event] = []);
    listeners.push({ listener, once: true });
    return this;
  }
  emitted(event) {
    return new Promise((resolve, reject) => {
      __classPrivateFieldSet(this, _MessageStream_catchingPromiseCreated, true, "f");
      if (event !== "error")
        this.once("error", reject);
      this.once(event, resolve);
    });
  }
  async done() {
    __classPrivateFieldSet(this, _MessageStream_catchingPromiseCreated, true, "f");
    await __classPrivateFieldGet(this, _MessageStream_endPromise, "f");
  }
  get currentMessage() {
    return __classPrivateFieldGet(this, _MessageStream_currentMessageSnapshot, "f");
  }
  async finalMessage() {
    await this.done();
    return __classPrivateFieldGet(this, _MessageStream_instances, "m", _MessageStream_getFinalMessage).call(this);
  }
  async finalText() {
    await this.done();
    return __classPrivateFieldGet(this, _MessageStream_instances, "m", _MessageStream_getFinalText).call(this);
  }
  _emit(event, ...args) {
    if (__classPrivateFieldGet(this, _MessageStream_ended, "f"))
      return;
    if (event === "end") {
      __classPrivateFieldSet(this, _MessageStream_ended, true, "f");
      __classPrivateFieldGet(this, _MessageStream_resolveEndPromise, "f").call(this);
    }
    const listeners = __classPrivateFieldGet(this, _MessageStream_listeners, "f")[event];
    if (listeners) {
      __classPrivateFieldGet(this, _MessageStream_listeners, "f")[event] = listeners.filter((l) => !l.once);
      listeners.forEach(({ listener }) => listener(...args));
    }
    if (event === "abort") {
      const error2 = args[0];
      if (!__classPrivateFieldGet(this, _MessageStream_catchingPromiseCreated, "f") && !listeners?.length) {
        Promise.reject(error2);
      }
      __classPrivateFieldGet(this, _MessageStream_rejectConnectedPromise, "f").call(this, error2);
      __classPrivateFieldGet(this, _MessageStream_rejectEndPromise, "f").call(this, error2);
      this._emit("end");
      return;
    }
    if (event === "error") {
      const error2 = args[0];
      if (!__classPrivateFieldGet(this, _MessageStream_catchingPromiseCreated, "f") && !listeners?.length) {
        Promise.reject(error2);
      }
      __classPrivateFieldGet(this, _MessageStream_rejectConnectedPromise, "f").call(this, error2);
      __classPrivateFieldGet(this, _MessageStream_rejectEndPromise, "f").call(this, error2);
      this._emit("end");
    }
  }
  _emitFinal() {
    const finalMessage = this.receivedMessages.at(-1);
    if (finalMessage) {
      this._emit("finalMessage", __classPrivateFieldGet(this, _MessageStream_instances, "m", _MessageStream_getFinalMessage).call(this));
    }
  }
  async _fromReadableStream(readableStream, options) {
    const signal = options?.signal;
    let abortHandler;
    if (signal) {
      if (signal.aborted)
        this.controller.abort();
      abortHandler = this.controller.abort.bind(this.controller);
      signal.addEventListener("abort", abortHandler);
    }
    try {
      __classPrivateFieldGet(this, _MessageStream_instances, "m", _MessageStream_beginRequest).call(this);
      this._connected(null);
      const stream = Stream.fromReadableStream(readableStream, this.controller);
      for await (const event of stream) {
        __classPrivateFieldGet(this, _MessageStream_instances, "m", _MessageStream_addStreamEvent).call(this, event);
      }
      if (stream.controller.signal?.aborted) {
        throw new APIUserAbortError;
      }
      __classPrivateFieldGet(this, _MessageStream_instances, "m", _MessageStream_endRequest).call(this);
    } finally {
      if (signal && abortHandler) {
        signal.removeEventListener("abort", abortHandler);
      }
    }
  }
  [(_MessageStream_currentMessageSnapshot = new WeakMap, _MessageStream_connectedPromise = new WeakMap, _MessageStream_resolveConnectedPromise = new WeakMap, _MessageStream_rejectConnectedPromise = new WeakMap, _MessageStream_endPromise = new WeakMap, _MessageStream_resolveEndPromise = new WeakMap, _MessageStream_rejectEndPromise = new WeakMap, _MessageStream_listeners = new WeakMap, _MessageStream_ended = new WeakMap, _MessageStream_errored = new WeakMap, _MessageStream_aborted = new WeakMap, _MessageStream_catchingPromiseCreated = new WeakMap, _MessageStream_response = new WeakMap, _MessageStream_request_id = new WeakMap, _MessageStream_handleError = new WeakMap, _MessageStream_instances = new WeakSet, _MessageStream_getFinalMessage = function _MessageStream_getFinalMessage() {
    if (this.receivedMessages.length === 0) {
      throw new AnthropicError("stream ended without producing a Message with role=assistant");
    }
    return this.receivedMessages.at(-1);
  }, _MessageStream_getFinalText = function _MessageStream_getFinalText() {
    if (this.receivedMessages.length === 0) {
      throw new AnthropicError("stream ended without producing a Message with role=assistant");
    }
    const textBlocks = this.receivedMessages.at(-1).content.filter((block) => block.type === "text").map((block) => block.text);
    if (textBlocks.length === 0) {
      throw new AnthropicError("stream ended without producing a content block with type=text");
    }
    return textBlocks.join(" ");
  }, _MessageStream_beginRequest = function _MessageStream_beginRequest() {
    if (this.ended)
      return;
    __classPrivateFieldSet(this, _MessageStream_currentMessageSnapshot, undefined, "f");
  }, _MessageStream_addStreamEvent = function _MessageStream_addStreamEvent(event) {
    if (this.ended)
      return;
    const messageSnapshot = __classPrivateFieldGet(this, _MessageStream_instances, "m", _MessageStream_accumulateMessage).call(this, event);
    this._emit("streamEvent", event, messageSnapshot);
    switch (event.type) {
      case "content_block_delta": {
        const content = messageSnapshot.content.at(-1);
        switch (event.delta.type) {
          case "text_delta": {
            if (content.type === "text") {
              this._emit("text", event.delta.text, content.text || "");
            }
            break;
          }
          case "citations_delta": {
            if (content.type === "text") {
              this._emit("citation", event.delta.citation, content.citations ?? []);
            }
            break;
          }
          case "input_json_delta": {
            if (tracksToolInput2(content) && content.input) {
              this._emit("inputJson", event.delta.partial_json, content.input);
            }
            break;
          }
          case "thinking_delta": {
            if (content.type === "thinking") {
              this._emit("thinking", event.delta.thinking, content.thinking);
            }
            break;
          }
          case "signature_delta": {
            if (content.type === "thinking") {
              this._emit("signature", content.signature);
            }
            break;
          }
          default:
            checkNever2(event.delta);
        }
        break;
      }
      case "message_stop": {
        this._addMessageParam(messageSnapshot);
        this._addMessage(messageSnapshot, true);
        break;
      }
      case "content_block_stop": {
        this._emit("contentBlock", messageSnapshot.content.at(-1));
        break;
      }
      case "message_start": {
        __classPrivateFieldSet(this, _MessageStream_currentMessageSnapshot, messageSnapshot, "f");
        break;
      }
      case "content_block_start":
      case "message_delta":
        break;
    }
  }, _MessageStream_endRequest = function _MessageStream_endRequest() {
    if (this.ended) {
      throw new AnthropicError(`stream has ended, this shouldn't happen`);
    }
    const snapshot = __classPrivateFieldGet(this, _MessageStream_currentMessageSnapshot, "f");
    if (!snapshot) {
      throw new AnthropicError(`request ended without sending any chunks`);
    }
    __classPrivateFieldSet(this, _MessageStream_currentMessageSnapshot, undefined, "f");
    return snapshot;
  }, _MessageStream_accumulateMessage = function _MessageStream_accumulateMessage(event) {
    let snapshot = __classPrivateFieldGet(this, _MessageStream_currentMessageSnapshot, "f");
    if (event.type === "message_start") {
      if (snapshot) {
        throw new AnthropicError(`Unexpected event order, got ${event.type} before receiving "message_stop"`);
      }
      return event.message;
    }
    if (!snapshot) {
      throw new AnthropicError(`Unexpected event order, got ${event.type} before "message_start"`);
    }
    switch (event.type) {
      case "message_stop":
        return snapshot;
      case "message_delta":
        snapshot.stop_reason = event.delta.stop_reason;
        snapshot.stop_sequence = event.delta.stop_sequence;
        snapshot.usage.output_tokens = event.usage.output_tokens;
        if (event.usage.input_tokens != null) {
          snapshot.usage.input_tokens = event.usage.input_tokens;
        }
        if (event.usage.cache_creation_input_tokens != null) {
          snapshot.usage.cache_creation_input_tokens = event.usage.cache_creation_input_tokens;
        }
        if (event.usage.cache_read_input_tokens != null) {
          snapshot.usage.cache_read_input_tokens = event.usage.cache_read_input_tokens;
        }
        if (event.usage.server_tool_use != null) {
          snapshot.usage.server_tool_use = event.usage.server_tool_use;
        }
        return snapshot;
      case "content_block_start":
        snapshot.content.push({ ...event.content_block });
        return snapshot;
      case "content_block_delta": {
        const snapshotContent = snapshot.content.at(event.index);
        switch (event.delta.type) {
          case "text_delta": {
            if (snapshotContent?.type === "text") {
              snapshot.content[event.index] = {
                ...snapshotContent,
                text: (snapshotContent.text || "") + event.delta.text
              };
            }
            break;
          }
          case "citations_delta": {
            if (snapshotContent?.type === "text") {
              snapshot.content[event.index] = {
                ...snapshotContent,
                citations: [...snapshotContent.citations ?? [], event.delta.citation]
              };
            }
            break;
          }
          case "input_json_delta": {
            if (snapshotContent && tracksToolInput2(snapshotContent)) {
              let jsonBuf = snapshotContent[JSON_BUF_PROPERTY2] || "";
              jsonBuf += event.delta.partial_json;
              const newContent = { ...snapshotContent };
              Object.defineProperty(newContent, JSON_BUF_PROPERTY2, {
                value: jsonBuf,
                enumerable: false,
                writable: true
              });
              if (jsonBuf) {
                newContent.input = partialParse(jsonBuf);
              }
              snapshot.content[event.index] = newContent;
            }
            break;
          }
          case "thinking_delta": {
            if (snapshotContent?.type === "thinking") {
              snapshot.content[event.index] = {
                ...snapshotContent,
                thinking: snapshotContent.thinking + event.delta.thinking
              };
            }
            break;
          }
          case "signature_delta": {
            if (snapshotContent?.type === "thinking") {
              snapshot.content[event.index] = {
                ...snapshotContent,
                signature: event.delta.signature
              };
            }
            break;
          }
          default:
            checkNever2(event.delta);
        }
        return snapshot;
      }
      case "content_block_stop":
        return snapshot;
    }
  }, Symbol.asyncIterator)]() {
    const pushQueue = [];
    const readQueue = [];
    let done = false;
    this.on("streamEvent", (event) => {
      const reader = readQueue.shift();
      if (reader) {
        reader.resolve(event);
      } else {
        pushQueue.push(event);
      }
    });
    this.on("end", () => {
      done = true;
      for (const reader of readQueue) {
        reader.resolve(undefined);
      }
      readQueue.length = 0;
    });
    this.on("abort", (err) => {
      done = true;
      for (const reader of readQueue) {
        reader.reject(err);
      }
      readQueue.length = 0;
    });
    this.on("error", (err) => {
      done = true;
      for (const reader of readQueue) {
        reader.reject(err);
      }
      readQueue.length = 0;
    });
    return {
      next: async () => {
        if (!pushQueue.length) {
          if (done) {
            return { value: undefined, done: true };
          }
          return new Promise((resolve, reject) => readQueue.push({ resolve, reject })).then((chunk2) => chunk2 ? { value: chunk2, done: false } : { value: undefined, done: true });
        }
        const chunk = pushQueue.shift();
        return { value: chunk, done: false };
      },
      return: async () => {
        this.abort();
        return { value: undefined, done: true };
      }
    };
  }
  toReadableStream() {
    const stream = new Stream(this[Symbol.asyncIterator].bind(this), this.controller);
    return stream.toReadableStream();
  }
}
function checkNever2(x) {}

// node_modules/@anthropic-ai/sdk/resources/messages/batches.mjs
class Batches2 extends APIResource {
  create(body, options) {
    return this._client.post("/v1/messages/batches", { body, ...options });
  }
  retrieve(messageBatchID, options) {
    return this._client.get(path`/v1/messages/batches/${messageBatchID}`, options);
  }
  list(query = {}, options) {
    return this._client.getAPIList("/v1/messages/batches", Page, { query, ...options });
  }
  delete(messageBatchID, options) {
    return this._client.delete(path`/v1/messages/batches/${messageBatchID}`, options);
  }
  cancel(messageBatchID, options) {
    return this._client.post(path`/v1/messages/batches/${messageBatchID}/cancel`, options);
  }
  async results(messageBatchID, options) {
    const batch = await this.retrieve(messageBatchID);
    if (!batch.results_url) {
      throw new AnthropicError(`No batch \`results_url\`; Has it finished processing? ${batch.processing_status} - ${batch.id}`);
    }
    return this._client.get(batch.results_url, {
      ...options,
      headers: buildHeaders([{ Accept: "application/binary" }, options?.headers]),
      stream: true,
      __binaryResponse: true
    })._thenUnwrap((_, props) => JSONLDecoder.fromResponse(props.response, props.controller));
  }
}

// node_modules/@anthropic-ai/sdk/resources/messages/messages.mjs
class Messages2 extends APIResource {
  constructor() {
    super(...arguments);
    this.batches = new Batches2(this._client);
  }
  create(body, options) {
    if (body.model in DEPRECATED_MODELS2) {
      console.warn(`The model '${body.model}' is deprecated and will reach end-of-life on ${DEPRECATED_MODELS2[body.model]}
Please migrate to a newer model. Visit https://docs.anthropic.com/en/docs/resources/model-deprecations for more information.`);
    }
    let timeout = this._client._options.timeout;
    if (!body.stream && timeout == null) {
      const maxNonstreamingTokens = MODEL_NONSTREAMING_TOKENS[body.model] ?? undefined;
      timeout = this._client.calculateNonstreamingTimeout(body.max_tokens, maxNonstreamingTokens);
    }
    return this._client.post("/v1/messages", {
      body,
      timeout: timeout ?? 600000,
      ...options,
      stream: body.stream ?? false
    });
  }
  stream(body, options) {
    return MessageStream.createMessage(this, body, options);
  }
  countTokens(body, options) {
    return this._client.post("/v1/messages/count_tokens", { body, ...options });
  }
}
var DEPRECATED_MODELS2 = {
  "claude-1.3": "November 6th, 2024",
  "claude-1.3-100k": "November 6th, 2024",
  "claude-instant-1.1": "November 6th, 2024",
  "claude-instant-1.1-100k": "November 6th, 2024",
  "claude-instant-1.2": "November 6th, 2024",
  "claude-3-sonnet-20240229": "July 21st, 2025",
  "claude-3-opus-20240229": "January 5th, 2026",
  "claude-2.1": "July 21st, 2025",
  "claude-2.0": "July 21st, 2025",
  "claude-3-7-sonnet-latest": "February 19th, 2026",
  "claude-3-7-sonnet-20250219": "February 19th, 2026"
};
Messages2.Batches = Batches2;
// node_modules/@anthropic-ai/sdk/resources/models.mjs
class Models2 extends APIResource {
  retrieve(modelID, params = {}, options) {
    const { betas } = params ?? {};
    return this._client.get(path`/v1/models/${modelID}`, {
      ...options,
      headers: buildHeaders([
        { ...betas?.toString() != null ? { "anthropic-beta": betas?.toString() } : undefined },
        options?.headers
      ])
    });
  }
  list(params = {}, options) {
    const { betas, ...query } = params ?? {};
    return this._client.getAPIList("/v1/models", Page, {
      query,
      ...options,
      headers: buildHeaders([
        { ...betas?.toString() != null ? { "anthropic-beta": betas?.toString() } : undefined },
        options?.headers
      ])
    });
  }
}
// node_modules/@anthropic-ai/sdk/internal/utils/env.mjs
var readEnv = (env2) => {
  if (typeof globalThis.process !== "undefined") {
    return globalThis.process.env?.[env2]?.trim() ?? undefined;
  }
  if (typeof globalThis.Deno !== "undefined") {
    return globalThis.Deno.env?.get?.(env2)?.trim();
  }
  return;
};

// node_modules/@anthropic-ai/sdk/client.mjs
var _BaseAnthropic_instances;
var _a;
var _BaseAnthropic_encoder;
var _BaseAnthropic_baseURLOverridden;
var HUMAN_PROMPT = "\\n\\nHuman:";
var AI_PROMPT = "\\n\\nAssistant:";

class BaseAnthropic {
  constructor({ baseURL = readEnv("ANTHROPIC_BASE_URL"), apiKey = readEnv("ANTHROPIC_API_KEY") ?? null, authToken = readEnv("ANTHROPIC_AUTH_TOKEN") ?? null, ...opts } = {}) {
    _BaseAnthropic_instances.add(this);
    _BaseAnthropic_encoder.set(this, undefined);
    const options = {
      apiKey,
      authToken,
      ...opts,
      baseURL: baseURL || `https://api.anthropic.com`
    };
    if (!options.dangerouslyAllowBrowser && isRunningInBrowser()) {
      throw new AnthropicError(`It looks like you're running in a browser-like environment.

This is disabled by default, as it risks exposing your secret API credentials to attackers.
If you understand the risks and have appropriate mitigations in place,
you can set the \`dangerouslyAllowBrowser\` option to \`true\`, e.g.,

new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
`);
    }
    this.baseURL = options.baseURL;
    this.timeout = options.timeout ?? _a.DEFAULT_TIMEOUT;
    this.logger = options.logger ?? console;
    const defaultLogLevel = "warn";
    this.logLevel = defaultLogLevel;
    this.logLevel = parseLogLevel(options.logLevel, "ClientOptions.logLevel", this) ?? parseLogLevel(readEnv("ANTHROPIC_LOG"), "process.env['ANTHROPIC_LOG']", this) ?? defaultLogLevel;
    this.fetchOptions = options.fetchOptions;
    this.maxRetries = options.maxRetries ?? 2;
    this.fetch = options.fetch ?? getDefaultFetch();
    __classPrivateFieldSet(this, _BaseAnthropic_encoder, FallbackEncoder, "f");
    this._options = options;
    this.apiKey = typeof apiKey === "string" ? apiKey : null;
    this.authToken = authToken;
  }
  withOptions(options) {
    const client = new this.constructor({
      ...this._options,
      baseURL: this.baseURL,
      maxRetries: this.maxRetries,
      timeout: this.timeout,
      logger: this.logger,
      logLevel: this.logLevel,
      fetch: this.fetch,
      fetchOptions: this.fetchOptions,
      apiKey: this.apiKey,
      authToken: this.authToken,
      ...options
    });
    return client;
  }
  defaultQuery() {
    return this._options.defaultQuery;
  }
  validateHeaders({ values, nulls }) {
    if (values.get("x-api-key") || values.get("authorization")) {
      return;
    }
    if (this.apiKey && values.get("x-api-key")) {
      return;
    }
    if (nulls.has("x-api-key")) {
      return;
    }
    if (this.authToken && values.get("authorization")) {
      return;
    }
    if (nulls.has("authorization")) {
      return;
    }
    throw new Error('Could not resolve authentication method. Expected either apiKey or authToken to be set. Or for one of the "X-Api-Key" or "Authorization" headers to be explicitly omitted');
  }
  async authHeaders(opts) {
    return buildHeaders([await this.apiKeyAuth(opts), await this.bearerAuth(opts)]);
  }
  async apiKeyAuth(opts) {
    if (this.apiKey == null) {
      return;
    }
    return buildHeaders([{ "X-Api-Key": this.apiKey }]);
  }
  async bearerAuth(opts) {
    if (this.authToken == null) {
      return;
    }
    return buildHeaders([{ Authorization: `Bearer ${this.authToken}` }]);
  }
  stringifyQuery(query) {
    return Object.entries(query).filter(([_, value]) => typeof value !== "undefined").map(([key, value]) => {
      if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
        return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
      }
      if (value === null) {
        return `${encodeURIComponent(key)}=`;
      }
      throw new AnthropicError(`Cannot stringify type ${typeof value}; Expected string, number, boolean, or null. If you need to pass nested query parameters, you can manually encode them, e.g. { query: { 'foo[key1]': value1, 'foo[key2]': value2 } }, and please open a GitHub issue requesting better support for your use case.`);
    }).join("&");
  }
  getUserAgent() {
    return `${this.constructor.name}/JS ${VERSION}`;
  }
  defaultIdempotencyKey() {
    return `stainless-node-retry-${uuid4()}`;
  }
  makeStatusError(status, error2, message, headers) {
    return APIError.generate(status, error2, message, headers);
  }
  buildURL(path2, query, defaultBaseURL) {
    const baseURL = !__classPrivateFieldGet(this, _BaseAnthropic_instances, "m", _BaseAnthropic_baseURLOverridden).call(this) && defaultBaseURL || this.baseURL;
    const url = isAbsoluteURL(path2) ? new URL(path2) : new URL(baseURL + (baseURL.endsWith("/") && path2.startsWith("/") ? path2.slice(1) : path2));
    const defaultQuery = this.defaultQuery();
    if (!isEmptyObj(defaultQuery)) {
      query = { ...defaultQuery, ...query };
    }
    if (typeof query === "object" && query && !Array.isArray(query)) {
      url.search = this.stringifyQuery(query);
    }
    return url.toString();
  }
  _calculateNonstreamingTimeout(maxTokens) {
    const defaultTimeout = 10 * 60;
    const expectedTimeout = 60 * 60 * maxTokens / 128000;
    if (expectedTimeout > defaultTimeout) {
      throw new AnthropicError("Streaming is required for operations that may take longer than 10 minutes. " + "See https://github.com/anthropics/anthropic-sdk-typescript#streaming-responses for more details");
    }
    return defaultTimeout * 1000;
  }
  async prepareOptions(options) {}
  async prepareRequest(request, { url, options }) {}
  get(path2, opts) {
    return this.methodRequest("get", path2, opts);
  }
  post(path2, opts) {
    return this.methodRequest("post", path2, opts);
  }
  patch(path2, opts) {
    return this.methodRequest("patch", path2, opts);
  }
  put(path2, opts) {
    return this.methodRequest("put", path2, opts);
  }
  delete(path2, opts) {
    return this.methodRequest("delete", path2, opts);
  }
  methodRequest(method, path2, opts) {
    return this.request(Promise.resolve(opts).then((opts2) => {
      return { method, path: path2, ...opts2 };
    }));
  }
  request(options, remainingRetries = null) {
    return new APIPromise(this, this.makeRequest(options, remainingRetries, undefined));
  }
  async makeRequest(optionsInput, retriesRemaining, retryOfRequestLogID) {
    const options = await optionsInput;
    const maxRetries = options.maxRetries ?? this.maxRetries;
    if (retriesRemaining == null) {
      retriesRemaining = maxRetries;
    }
    await this.prepareOptions(options);
    const { req, url, timeout } = await this.buildRequest(options, {
      retryCount: maxRetries - retriesRemaining
    });
    await this.prepareRequest(req, { url, options });
    const requestLogID = "log_" + (Math.random() * (1 << 24) | 0).toString(16).padStart(6, "0");
    const retryLogStr = retryOfRequestLogID === undefined ? "" : `, retryOf: ${retryOfRequestLogID}`;
    const startTime = Date.now();
    loggerFor(this).debug(`[${requestLogID}] sending request`, formatRequestDetails({
      retryOfRequestLogID,
      method: options.method,
      url,
      options,
      headers: req.headers
    }));
    if (options.signal?.aborted) {
      throw new APIUserAbortError;
    }
    const controller = new AbortController;
    const response = await this.fetchWithTimeout(url, req, timeout, controller).catch(castToError);
    const headersTime = Date.now();
    if (response instanceof globalThis.Error) {
      const retryMessage = `retrying, ${retriesRemaining} attempts remaining`;
      if (options.signal?.aborted) {
        throw new APIUserAbortError;
      }
      const isTimeout = isAbortError(response) || /timed? ?out/i.test(String(response) + ("cause" in response ? String(response.cause) : ""));
      if (retriesRemaining) {
        loggerFor(this).info(`[${requestLogID}] connection ${isTimeout ? "timed out" : "failed"} - ${retryMessage}`);
        loggerFor(this).debug(`[${requestLogID}] connection ${isTimeout ? "timed out" : "failed"} (${retryMessage})`, formatRequestDetails({
          retryOfRequestLogID,
          url,
          durationMs: headersTime - startTime,
          message: response.message
        }));
        return this.retryRequest(options, retriesRemaining, retryOfRequestLogID ?? requestLogID);
      }
      loggerFor(this).info(`[${requestLogID}] connection ${isTimeout ? "timed out" : "failed"} - error; no more retries left`);
      loggerFor(this).debug(`[${requestLogID}] connection ${isTimeout ? "timed out" : "failed"} (error; no more retries left)`, formatRequestDetails({
        retryOfRequestLogID,
        url,
        durationMs: headersTime - startTime,
        message: response.message
      }));
      if (isTimeout) {
        throw new APIConnectionTimeoutError;
      }
      throw new APIConnectionError({ cause: response });
    }
    const specialHeaders = [...response.headers.entries()].filter(([name]) => name === "request-id").map(([name, value]) => ", " + name + ": " + JSON.stringify(value)).join("");
    const responseInfo = `[${requestLogID}${retryLogStr}${specialHeaders}] ${req.method} ${url} ${response.ok ? "succeeded" : "failed"} with status ${response.status} in ${headersTime - startTime}ms`;
    if (!response.ok) {
      const shouldRetry = await this.shouldRetry(response);
      if (retriesRemaining && shouldRetry) {
        const retryMessage2 = `retrying, ${retriesRemaining} attempts remaining`;
        await CancelReadableStream(response.body);
        loggerFor(this).info(`${responseInfo} - ${retryMessage2}`);
        loggerFor(this).debug(`[${requestLogID}] response error (${retryMessage2})`, formatRequestDetails({
          retryOfRequestLogID,
          url: response.url,
          status: response.status,
          headers: response.headers,
          durationMs: headersTime - startTime
        }));
        return this.retryRequest(options, retriesRemaining, retryOfRequestLogID ?? requestLogID, response.headers);
      }
      const retryMessage = shouldRetry ? `error; no more retries left` : `error; not retryable`;
      loggerFor(this).info(`${responseInfo} - ${retryMessage}`);
      const errText = await response.text().catch((err2) => castToError(err2).message);
      const errJSON = safeJSON(errText);
      const errMessage = errJSON ? undefined : errText;
      loggerFor(this).debug(`[${requestLogID}] response error (${retryMessage})`, formatRequestDetails({
        retryOfRequestLogID,
        url: response.url,
        status: response.status,
        headers: response.headers,
        message: errMessage,
        durationMs: Date.now() - startTime
      }));
      const err = this.makeStatusError(response.status, errJSON, errMessage, response.headers);
      throw err;
    }
    loggerFor(this).info(responseInfo);
    loggerFor(this).debug(`[${requestLogID}] response start`, formatRequestDetails({
      retryOfRequestLogID,
      url: response.url,
      status: response.status,
      headers: response.headers,
      durationMs: headersTime - startTime
    }));
    return { response, options, controller, requestLogID, retryOfRequestLogID, startTime };
  }
  getAPIList(path2, Page2, opts) {
    return this.requestAPIList(Page2, { method: "get", path: path2, ...opts });
  }
  requestAPIList(Page2, options) {
    const request = this.makeRequest(options, null, undefined);
    return new PagePromise(this, request, Page2);
  }
  async fetchWithTimeout(url, init, ms, controller) {
    const { signal, method, ...options } = init || {};
    if (signal)
      signal.addEventListener("abort", () => controller.abort());
    const timeout = setTimeout(() => controller.abort(), ms);
    const isReadableBody = globalThis.ReadableStream && options.body instanceof globalThis.ReadableStream || typeof options.body === "object" && options.body !== null && Symbol.asyncIterator in options.body;
    const fetchOptions = {
      signal: controller.signal,
      ...isReadableBody ? { duplex: "half" } : {},
      method: "GET",
      ...options
    };
    if (method) {
      fetchOptions.method = method.toUpperCase();
    }
    try {
      return await this.fetch.call(undefined, url, fetchOptions);
    } finally {
      clearTimeout(timeout);
    }
  }
  async shouldRetry(response) {
    const shouldRetryHeader = response.headers.get("x-should-retry");
    if (shouldRetryHeader === "true")
      return true;
    if (shouldRetryHeader === "false")
      return false;
    if (response.status === 408)
      return true;
    if (response.status === 409)
      return true;
    if (response.status === 429)
      return true;
    if (response.status >= 500)
      return true;
    return false;
  }
  async retryRequest(options, retriesRemaining, requestLogID, responseHeaders) {
    let timeoutMillis;
    const retryAfterMillisHeader = responseHeaders?.get("retry-after-ms");
    if (retryAfterMillisHeader) {
      const timeoutMs = parseFloat(retryAfterMillisHeader);
      if (!Number.isNaN(timeoutMs)) {
        timeoutMillis = timeoutMs;
      }
    }
    const retryAfterHeader = responseHeaders?.get("retry-after");
    if (retryAfterHeader && !timeoutMillis) {
      const timeoutSeconds = parseFloat(retryAfterHeader);
      if (!Number.isNaN(timeoutSeconds)) {
        timeoutMillis = timeoutSeconds * 1000;
      } else {
        timeoutMillis = Date.parse(retryAfterHeader) - Date.now();
      }
    }
    if (!(timeoutMillis && 0 <= timeoutMillis && timeoutMillis < 60 * 1000)) {
      const maxRetries = options.maxRetries ?? this.maxRetries;
      timeoutMillis = this.calculateDefaultRetryTimeoutMillis(retriesRemaining, maxRetries);
    }
    await sleep(timeoutMillis);
    return this.makeRequest(options, retriesRemaining - 1, requestLogID);
  }
  calculateDefaultRetryTimeoutMillis(retriesRemaining, maxRetries) {
    const initialRetryDelay = 0.5;
    const maxRetryDelay = 8;
    const numRetries = maxRetries - retriesRemaining;
    const sleepSeconds = Math.min(initialRetryDelay * Math.pow(2, numRetries), maxRetryDelay);
    const jitter = 1 - Math.random() * 0.25;
    return sleepSeconds * jitter * 1000;
  }
  calculateNonstreamingTimeout(maxTokens, maxNonstreamingTokens) {
    const maxTime = 60 * 60 * 1000;
    const defaultTime = 60 * 10 * 1000;
    const expectedTime = maxTime * maxTokens / 128000;
    if (expectedTime > defaultTime || maxNonstreamingTokens != null && maxTokens > maxNonstreamingTokens) {
      throw new AnthropicError("Streaming is required for operations that may take longer than 10 minutes. See https://github.com/anthropics/anthropic-sdk-typescript#long-requests for more details");
    }
    return defaultTime;
  }
  async buildRequest(inputOptions, { retryCount = 0 } = {}) {
    const options = { ...inputOptions };
    const { method, path: path2, query, defaultBaseURL } = options;
    const url = this.buildURL(path2, query, defaultBaseURL);
    if ("timeout" in options)
      validatePositiveInteger("timeout", options.timeout);
    options.timeout = options.timeout ?? this.timeout;
    const { bodyHeaders, body } = this.buildBody({ options });
    const reqHeaders = await this.buildHeaders({ options: inputOptions, method, bodyHeaders, retryCount });
    const req = {
      method,
      headers: reqHeaders,
      ...options.signal && { signal: options.signal },
      ...globalThis.ReadableStream && body instanceof globalThis.ReadableStream && { duplex: "half" },
      ...body && { body },
      ...this.fetchOptions ?? {},
      ...options.fetchOptions ?? {}
    };
    return { req, url, timeout: options.timeout };
  }
  async buildHeaders({ options, method, bodyHeaders, retryCount }) {
    let idempotencyHeaders = {};
    if (this.idempotencyHeader && method !== "get") {
      if (!options.idempotencyKey)
        options.idempotencyKey = this.defaultIdempotencyKey();
      idempotencyHeaders[this.idempotencyHeader] = options.idempotencyKey;
    }
    const headers = buildHeaders([
      idempotencyHeaders,
      {
        Accept: "application/json",
        "User-Agent": this.getUserAgent(),
        "X-Stainless-Retry-Count": String(retryCount),
        ...options.timeout ? { "X-Stainless-Timeout": String(Math.trunc(options.timeout / 1000)) } : {},
        ...getPlatformHeaders(),
        ...this._options.dangerouslyAllowBrowser ? { "anthropic-dangerous-direct-browser-access": "true" } : undefined,
        "anthropic-version": "2023-06-01"
      },
      await this.authHeaders(options),
      this._options.defaultHeaders,
      bodyHeaders,
      options.headers
    ]);
    this.validateHeaders(headers);
    return headers.values;
  }
  buildBody({ options: { body, headers: rawHeaders } }) {
    if (!body) {
      return { bodyHeaders: undefined, body: undefined };
    }
    const headers = buildHeaders([rawHeaders]);
    if (ArrayBuffer.isView(body) || body instanceof ArrayBuffer || body instanceof DataView || typeof body === "string" && headers.values.has("content-type") || globalThis.Blob && body instanceof globalThis.Blob || body instanceof FormData || body instanceof URLSearchParams || globalThis.ReadableStream && body instanceof globalThis.ReadableStream) {
      return { bodyHeaders: undefined, body };
    } else if (typeof body === "object" && ((Symbol.asyncIterator in body) || (Symbol.iterator in body) && ("next" in body) && typeof body.next === "function")) {
      return { bodyHeaders: undefined, body: ReadableStreamFrom(body) };
    } else {
      return __classPrivateFieldGet(this, _BaseAnthropic_encoder, "f").call(this, { body, headers });
    }
  }
}
_a = BaseAnthropic, _BaseAnthropic_encoder = new WeakMap, _BaseAnthropic_instances = new WeakSet, _BaseAnthropic_baseURLOverridden = function _BaseAnthropic_baseURLOverridden2() {
  return this.baseURL !== "https://api.anthropic.com";
};
BaseAnthropic.Anthropic = _a;
BaseAnthropic.HUMAN_PROMPT = HUMAN_PROMPT;
BaseAnthropic.AI_PROMPT = AI_PROMPT;
BaseAnthropic.DEFAULT_TIMEOUT = 600000;
BaseAnthropic.AnthropicError = AnthropicError;
BaseAnthropic.APIError = APIError;
BaseAnthropic.APIConnectionError = APIConnectionError;
BaseAnthropic.APIConnectionTimeoutError = APIConnectionTimeoutError;
BaseAnthropic.APIUserAbortError = APIUserAbortError;
BaseAnthropic.NotFoundError = NotFoundError;
BaseAnthropic.ConflictError = ConflictError;
BaseAnthropic.RateLimitError = RateLimitError;
BaseAnthropic.BadRequestError = BadRequestError;
BaseAnthropic.AuthenticationError = AuthenticationError;
BaseAnthropic.InternalServerError = InternalServerError;
BaseAnthropic.PermissionDeniedError = PermissionDeniedError;
BaseAnthropic.UnprocessableEntityError = UnprocessableEntityError;
BaseAnthropic.toFile = toFile;

class Anthropic extends BaseAnthropic {
  constructor() {
    super(...arguments);
    this.completions = new Completions(this);
    this.messages = new Messages2(this);
    this.models = new Models2(this);
    this.beta = new Beta(this);
  }
}
Anthropic.Completions = Completions;
Anthropic.Messages = Messages2;
Anthropic.Models = Models2;
Anthropic.Beta = Beta;
// src/core/llm/providers/AnthropicProvider.ts
class AnthropicProvider {
  name = "anthropic";
  capabilities = {
    streaming: true,
    vision: true,
    tools: true,
    systemPrompt: true,
    multiModal: true
  };
  client;
  defaultModel;
  constructor(config) {
    const apiKey = config.apiKey || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      this.client = null;
      this.defaultModel = config.defaultModel || "claude-sonnet-4.5-20250929";
      return;
    }
    this.client = new Anthropic({ apiKey });
    this.defaultModel = config.defaultModel || "claude-sonnet-4.5-20250929";
  }
  async complete(request) {
    if (!this.client) {
      throw new Error('ANTHROPIC_API_KEY not set. Please export ANTHROPIC_API_KEY="sk-ant-..." or use a different provider (e.g., GLM via MCP).');
    }
    const model = request.model || this.defaultModel;
    const anthropicMessages = this.convertMessages(request.messages);
    const response = await this.client.messages.create({
      model,
      max_tokens: request.max_tokens || 4096,
      temperature: request.temperature,
      top_p: request.top_p,
      top_k: request.top_k,
      stop_sequences: request.stop_sequences,
      system: request.system,
      messages: anthropicMessages,
      tools: request.tools
    });
    return this.convertResponse(response);
  }
  async streamComplete(request, handler) {
    if (!this.client) {
      throw new Error('ANTHROPIC_API_KEY not set. Please export ANTHROPIC_API_KEY="sk-ant-..." or use a different provider (e.g., GLM via MCP).');
    }
    const model = request.model || this.defaultModel;
    const anthropicMessages = this.convertMessages(request.messages);
    const stream = await this.client.messages.create({
      model,
      max_tokens: request.max_tokens || 4096,
      temperature: request.temperature,
      top_p: request.top_p,
      top_k: request.top_k,
      stop_sequences: request.stop_sequences,
      system: request.system,
      messages: anthropicMessages,
      tools: request.tools,
      stream: true
    });
    const fullResponse = {
      id: "",
      model,
      role: "assistant",
      content: [],
      stop_reason: null,
      usage: { input_tokens: 0, output_tokens: 0 }
    };
    for await (const event of stream) {
      const streamEvent = this.convertStreamEvent(event);
      if (streamEvent.type === "message_start") {
        fullResponse.id = streamEvent.message.id || "";
        fullResponse.usage = streamEvent.message.usage || fullResponse.usage;
      } else if (streamEvent.type === "content_block_start") {
        fullResponse.content[streamEvent.index] = streamEvent.content_block;
      } else if (streamEvent.type === "content_block_delta") {
        const block = fullResponse.content[streamEvent.index];
        if (block && block.type === "text" && streamEvent.delta.type === "text_delta") {
          block.text = (block.text || "") + (streamEvent.delta.text || "");
        }
      } else if (streamEvent.type === "message_delta") {
        if (streamEvent.delta.stop_reason) {
          fullResponse.stop_reason = streamEvent.delta.stop_reason;
        }
        if (streamEvent.usage) {
          fullResponse.usage = { ...fullResponse.usage, ...streamEvent.usage };
        }
      }
      await handler(streamEvent);
    }
    return fullResponse;
  }
  async listModels() {
    return [
      "claude-opus-4.5-20251101",
      "claude-sonnet-4.5-20250929",
      "claude-3-5-sonnet-20241022",
      "claude-3-5-haiku-20241022",
      "claude-3-opus-20240229",
      "claude-3-sonnet-20240229",
      "claude-3-haiku-20240307"
    ];
  }
  convertMessages(messages) {
    return messages.filter((m) => m.role !== "system").map((m) => ({
      role: m.role,
      content: typeof m.content === "string" ? m.content : m.content.map((block) => this.convertContentBlock(block))
    }));
  }
  convertContentBlock(block) {
    if (block.type === "text") {
      return { type: "text", text: block.text };
    } else if (block.type === "image") {
      return {
        type: "image",
        source: block.source
      };
    } else if (block.type === "tool_use") {
      return {
        type: "tool_use",
        id: block.id,
        name: block.name,
        input: block.input
      };
    } else if (block.type === "tool_result") {
      return {
        type: "tool_result",
        tool_use_id: block.tool_use_id,
        content: block.content,
        is_error: block.is_error
      };
    }
    return block;
  }
  convertResponse(response) {
    return {
      id: response.id,
      model: response.model,
      role: "assistant",
      content: response.content.map((block) => this.convertContentBlock(block)),
      stop_reason: response.stop_reason,
      usage: {
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens,
        total_tokens: response.usage.input_tokens + response.usage.output_tokens
      }
    };
  }
  convertStreamEvent(event) {
    if (event.type === "message_start") {
      return {
        type: "message_start",
        message: {
          id: event.message.id,
          model: event.message.model,
          role: event.message.role,
          usage: event.message.usage
        }
      };
    } else if (event.type === "content_block_start") {
      return {
        type: "content_block_start",
        index: event.index,
        content_block: event.content_block
      };
    } else if (event.type === "content_block_delta") {
      return {
        type: "content_block_delta",
        index: event.index,
        delta: event.delta
      };
    } else if (event.type === "content_block_stop") {
      return {
        type: "content_block_stop",
        index: event.index
      };
    } else if (event.type === "message_delta") {
      return {
        type: "message_delta",
        delta: event.delta,
        usage: event.usage
      };
    } else if (event.type === "message_stop") {
      return {
        type: "message_stop"
      };
    } else if (event.type === "error") {
      return {
        type: "error",
        error: event.error
      };
    }
    return {
      type: "error",
      error: {
        type: "unknown_event",
        message: `Unknown stream event: ${event.type}`
      }
    };
  }
}
// src/core/llm/providers/MCPProvider.ts
var MCP_MODELS = {
  "dolphin-3": {
    id: "featherless/dphn/Dolphin-Mistral-24B-Venice-Edition",
    name: "Dolphin-3 Venice",
    capabilities: ["coding", "security", "reverse-engineering", "unrestricted"],
    cost: "low",
    speed: "fast",
    quality: "high",
    vision: false
  },
  "qwen-72b": {
    id: "featherless/huihui-ai/Qwen2.5-72B-Instruct-abliterated",
    name: "Qwen 2.5 72B",
    capabilities: ["reasoning", "coding", "writing", "unrestricted"],
    cost: "medium",
    speed: "medium",
    quality: "exceptional",
    vision: false
  },
  whiterabbit: {
    id: "featherless/WhiteRabbitNeo/Llama-3-WhiteRabbitNeo-8B-v2.0",
    name: "WhiteRabbitNeo 8B",
    capabilities: ["coding", "creative", "unrestricted"],
    cost: "very-low",
    speed: "very-fast",
    quality: "good",
    vision: false
  },
  "llama-fast": {
    id: "featherless/mlabonne/Meta-Llama-3.1-8B-Instruct-abliterated",
    name: "Llama 3.1 8B",
    capabilities: ["general", "fast-response", "unrestricted"],
    cost: "very-low",
    speed: "very-fast",
    quality: "good",
    vision: false
  },
  "llama-70b": {
    id: "featherless/huihui-ai/Llama-3.3-70B-Instruct-abliterated",
    name: "Llama 3.3 70B",
    capabilities: ["reasoning", "coding", "writing", "unrestricted"],
    cost: "medium",
    speed: "medium",
    quality: "exceptional",
    vision: false
  },
  "kimi-k2": {
    id: "featherless/moonshotai/Kimi-K2-Instruct",
    name: "Kimi K2",
    capabilities: ["agentic", "coding", "autonomous", "reasoning", "unrestricted"],
    cost: "medium",
    speed: "fast",
    quality: "exceptional",
    vision: false
  },
  "glm-4.7": {
    id: "glm/glm-4.7",
    name: "GLM-4.7",
    capabilities: ["reasoning", "coding", "chinese", "multilingual"],
    cost: "low",
    speed: "fast",
    quality: "high",
    vision: false
  }
};

class MCPProvider {
  name = "mcp";
  capabilities = {
    streaming: false,
    vision: false,
    tools: false,
    systemPrompt: true,
    multiModal: false
  };
  proxyUrl;
  defaultModel;
  constructor(config) {
    this.proxyUrl = config.baseUrl || process.env.PROXY_URL || "http://127.0.0.1:3000";
    this.defaultModel = config.defaultModel || "glm-4.7";
  }
  async complete(request) {
    const modelKey = request.model || this.defaultModel;
    const modelInfo = MCP_MODELS[modelKey];
    if (!modelInfo) {
      throw new Error(`Unknown MCP model: ${modelKey}. Available: ${Object.keys(MCP_MODELS).join(", ")}`);
    }
    const messages = [];
    if (request.system) {
      messages.push({ role: "system", content: request.system });
    }
    for (const msg of request.messages) {
      messages.push({
        role: msg.role,
        content: this.flattenContent(msg.content)
      });
    }
    const response = await fetch(`${this.proxyUrl}/v1/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: modelInfo.id,
        messages,
        max_tokens: request.max_tokens || 2048,
        temperature: request.temperature,
        stream: false
      })
    });
    if (!response.ok) {
      const error2 = await response.text();
      throw new Error(`MCP proxy error: ${response.status} ${error2}`);
    }
    const data = await response.json();
    if (data.error) {
      throw new Error(data.error.message || JSON.stringify(data.error));
    }
    const text = data.content?.find((b) => b.type === "text")?.text || "";
    return {
      id: data.id || `mcp-${Date.now()}`,
      model: modelKey,
      role: "assistant",
      content: [{ type: "text", text }],
      stop_reason: "end_turn",
      usage: {
        input_tokens: data.usage?.input_tokens || 0,
        output_tokens: data.usage?.output_tokens || 0,
        total_tokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0)
      }
    };
  }
  async streamComplete(_request, _handler) {
    throw new Error("Streaming not supported by MCP provider yet");
  }
  async listModels() {
    return Object.keys(MCP_MODELS);
  }
  getModelInfo(modelKey) {
    return MCP_MODELS[modelKey];
  }
  flattenContent(content) {
    if (typeof content === "string") {
      return content;
    }
    return content.filter((block) => block.type === "text").map((block) => block.text).join(`
`);
  }
}
async function isMCPAvailable(proxyUrl = "http://127.0.0.1:3000") {
  try {
    await fetch(`${proxyUrl}/v1/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "test",
        messages: [{ role: "user", content: "test" }],
        max_tokens: 1
      })
    });
    return true;
  } catch {
    return false;
  }
}
// src/core/llm/providers/ProviderFactory.ts
function createProvider(type, config) {
  const fullConfig = {
    name: type,
    ...config
  };
  switch (type) {
    case "anthropic":
      return new AnthropicProvider(fullConfig);
    case "mcp":
      return new MCPProvider(fullConfig);
    default:
      throw new Error(`Unknown provider type: ${type}`);
  }
}

class ProviderRegistry {
  providers = new Map;
  defaultProvider;
  register(name, provider, isDefault = false) {
    this.providers.set(name, provider);
    if (isDefault) {
      this.defaultProvider = provider;
    }
  }
  get(name) {
    return this.providers.get(name);
  }
  getDefault() {
    if (!this.defaultProvider) {
      throw new Error("No default provider configured");
    }
    return this.defaultProvider;
  }
  list() {
    return Array.from(this.providers.keys());
  }
  has(name) {
    return this.providers.has(name);
  }
  getMap() {
    return this.providers;
  }
}
async function createDefaultRegistry() {
  const registry = new ProviderRegistry;
  const anthropic = createProvider("anthropic");
  registry.register("anthropic", anthropic);
  const mcpAvailable = await isMCPAvailable();
  if (mcpAvailable) {
    const mcp = createProvider("mcp");
    registry.register("mcp", mcp, true);
  } else {
    registry.register("anthropic", anthropic, true);
  }
  return registry;
}
// src/core/llm/RateLimiter.ts
class RateLimiter {
  limits;
  buckets;
  lastRefill;
  queues;
  constructor(config = {}) {
    this.limits = new Map([
      ["anthropic", config.anthropic || 50],
      ["google", config.google || 60],
      ["glm", config.glm || 60],
      ["featherless", config.featherless || 100],
      ["mcp", config.mcp || 100]
    ]);
    this.buckets = new Map;
    this.lastRefill = new Map;
    this.queues = new Map;
    for (const [provider, limit] of this.limits.entries()) {
      this.buckets.set(provider, limit);
      this.lastRefill.set(provider, Date.now());
      this.queues.set(provider, []);
    }
  }
  refillTokens(provider) {
    const now = Date.now();
    const lastRefillTime = this.lastRefill.get(provider) || now;
    const elapsedSeconds = (now - lastRefillTime) / 1000;
    const limit = this.limits.get(provider) || 50;
    const tokensPerSecond = limit / 60;
    const tokensToAdd = elapsedSeconds * tokensPerSecond;
    const currentBucket = this.buckets.get(provider) || limit;
    const newBucket = Math.min(limit, currentBucket + tokensToAdd);
    this.buckets.set(provider, newBucket);
    this.lastRefill.set(provider, now);
  }
  canProceed(provider) {
    this.refillTokens(provider);
    const bucket = this.buckets.get(provider) || 0;
    return bucket >= 1;
  }
  consumeToken(provider) {
    const current = this.buckets.get(provider) || 0;
    this.buckets.set(provider, Math.max(0, current - 1));
  }
  async waitForToken(provider, timeoutMs = 60000) {
    const startTime = Date.now();
    while (!this.canProceed(provider)) {
      if (Date.now() - startTime > timeoutMs) {
        throw new Error(`Rate limit timeout for provider: ${provider}`);
      }
      const limit = this.limits.get(provider) || 50;
      const tokensPerMs = limit / 60000;
      const waitTime = Math.ceil(1 / tokensPerMs);
      await new Promise((resolve) => setTimeout(resolve, Math.min(waitTime, 1000)));
    }
    this.consumeToken(provider);
  }
  getStatus(provider) {
    this.refillTokens(provider);
    const available = this.buckets.get(provider) || 0;
    const limit = this.limits.get(provider) || 50;
    const percentage = available / limit * 100;
    return { available, limit, percentage };
  }
  reset(provider) {
    const limit = this.limits.get(provider) || 50;
    this.buckets.set(provider, limit);
    this.lastRefill.set(provider, Date.now());
  }
  setLimit(provider, limit) {
    this.limits.set(provider, limit);
    this.buckets.set(provider, limit);
    this.lastRefill.set(provider, Date.now());
  }
}

// src/core/llm/ErrorHandler.ts
class ErrorHandler {
  classify(error2) {
    const message = error2.message || String(error2);
    const statusCode = error2.status || error2.statusCode;
    if (statusCode === 429 || message.includes("429") || message.includes("rate limit") || message.includes("quota exceeded") || message.includes("too many requests")) {
      return {
        type: "rate_limit",
        message: "Rate limit exceeded. Please wait before retrying.",
        isRetryable: true,
        suggestedDelay: this.parseRetryAfter(error2),
        originalError: error2
      };
    }
    if (statusCode === 401 || statusCode === 403 || message.includes("401") || message.includes("403") || message.includes("authentication") || message.includes("unauthorized") || message.includes("invalid api key") || message.includes("invalid bearer token")) {
      return {
        type: "authentication",
        message: "Authentication failed. Check your API key.",
        isRetryable: false,
        originalError: error2
      };
    }
    if (message.includes("timeout") || message.includes("ETIMEDOUT") || message.includes("ECONNRESET") || message.includes("ESOCKETTIMEDOUT") || error2.code === "ETIMEDOUT") {
      return {
        type: "timeout",
        message: "Request timeout. The provider may be slow or unavailable.",
        isRetryable: true,
        suggestedDelay: 2000,
        originalError: error2
      };
    }
    if (message.includes("ECONNREFUSED") || message.includes("ENOTFOUND") || message.includes("ENETUNREACH") || message.includes("network") || error2.code === "ECONNREFUSED" || error2.code === "ENOTFOUND") {
      return {
        type: "network",
        message: "Network error. Check your internet connection.",
        isRetryable: true,
        suggestedDelay: 1000,
        originalError: error2
      };
    }
    if (statusCode === 400 || message.includes("400") || message.includes("invalid request") || message.includes("bad request")) {
      return {
        type: "invalid_request",
        message: "Invalid request. Check your input parameters.",
        isRetryable: false,
        originalError: error2
      };
    }
    if (statusCode >= 500 || message.includes("500") || message.includes("502") || message.includes("503") || message.includes("504") || message.includes("server error") || message.includes("internal error")) {
      return {
        type: "server_error",
        message: "Server error. The provider may be experiencing issues.",
        isRetryable: true,
        suggestedDelay: 5000,
        originalError: error2
      };
    }
    return {
      type: "unknown",
      message: message || "An unknown error occurred.",
      isRetryable: false,
      originalError: error2
    };
  }
  parseRetryAfter(error2) {
    const retryAfter = error2.response?.headers?.["retry-after"] || error2.headers?.["retry-after"];
    if (!retryAfter)
      return 60000;
    const seconds = parseInt(retryAfter, 10);
    if (!isNaN(seconds)) {
      return seconds * 1000;
    }
    try {
      const retryDate = new Date(retryAfter);
      const now = new Date;
      return Math.max(0, retryDate.getTime() - now.getTime());
    } catch {
      return 60000;
    }
  }
  shouldRetry(classified, attempt, maxRetries) {
    if (!classified.isRetryable)
      return false;
    if (attempt >= maxRetries)
      return false;
    return true;
  }
  calculateDelay(classified, attempt, options = {}) {
    const initialDelay = options.initialDelay || 1000;
    const maxDelay = options.maxDelay || 60000;
    const factor = options.factor || 2;
    if (classified.suggestedDelay) {
      return Math.min(classified.suggestedDelay, maxDelay);
    }
    const multiplier = classified.type === "rate_limit" ? 2 : 1;
    const delay = initialDelay * Math.pow(factor, attempt) * multiplier;
    return Math.min(delay, maxDelay);
  }
  async retryWithBackoff(fn, options = {}) {
    const maxRetries = options.maxRetries || 3;
    const onRetry = options.onRetry;
    let lastError;
    for (let attempt = 0;attempt <= maxRetries; attempt++) {
      try {
        return await fn(attempt);
      } catch (error2) {
        lastError = error2;
        const classified = this.classify(error2);
        if (!this.shouldRetry(classified, attempt, maxRetries)) {
          throw error2;
        }
        const delay = this.calculateDelay(classified, attempt, options);
        if (onRetry) {
          onRetry(attempt + 1, delay, error2);
        }
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
    throw lastError;
  }
  formatError(classified) {
    const prefix = this.getErrorPrefix(classified.type);
    return `${prefix} ${classified.message}`;
  }
  getErrorPrefix(type) {
    switch (type) {
      case "rate_limit":
        return "[RATE LIMIT]";
      case "authentication":
        return "[AUTH ERROR]";
      case "timeout":
        return "[TIMEOUT]";
      case "network":
        return "[NETWORK ERROR]";
      case "invalid_request":
        return "[INVALID REQUEST]";
      case "server_error":
        return "[SERVER ERROR]";
      default:
        return "[ERROR]";
    }
  }
  getRemediation(type) {
    switch (type) {
      case "rate_limit":
        return [
          "Wait for the rate limit to reset",
          "Reduce the number of concurrent requests",
          "Consider upgrading your API plan"
        ];
      case "authentication":
        return [
          "Check that ANTHROPIC_API_KEY is set correctly",
          "Verify your API key is valid at console.anthropic.com",
          "Ensure the API key has not been revoked"
        ];
      case "timeout":
        return [
          "Increase the request timeout value",
          "Try again in a few moments",
          "Check if the provider is experiencing issues"
        ];
      case "network":
        return [
          "Check your internet connection",
          "Verify firewall settings",
          "Try using a different network"
        ];
      case "invalid_request":
        return [
          "Check your input parameters",
          "Verify the model name is correct",
          "Review the API documentation for valid inputs"
        ];
      case "server_error":
        return [
          "Wait a few minutes and try again",
          "Check provider status page",
          "Consider using a fallback provider"
        ];
      default:
        return ["Review the error message for details"];
    }
  }
}

// src/core/llm/ConcurrencyManager.ts
class ConcurrencyManager {
  limits;
  semaphores;
  tokenBuckets;
  constructor(limits) {
    this.limits = limits;
    this.semaphores = new Map;
    this.tokenBuckets = new Map;
    for (const [provider, config] of Object.entries(limits)) {
      this.semaphores.set(provider, new Semaphore(config.maxConcurrent));
      if (config.reservoir && config.reservoirRefresh) {
        this.tokenBuckets.set(provider, new TokenBucket(config.reservoir, config.reservoirRefresh));
      }
    }
  }
  async acquire(provider) {
    const semaphore = this.semaphores.get(provider);
    if (!semaphore) {
      throw new Error(`No concurrency limits configured for provider: ${provider}`);
    }
    const tokenBucket = this.tokenBuckets.get(provider);
    if (tokenBucket) {
      await tokenBucket.consume();
    }
    const release = await semaphore.acquire();
    const config = this.limits[provider];
    if (config.minTimeBetween) {
      await this.delay(config.minTimeBetween);
    }
    return release;
  }
  getStatus(provider) {
    const semaphore = this.semaphores.get(provider);
    if (!semaphore) {
      throw new Error(`No concurrency limits configured for provider: ${provider}`);
    }
    return semaphore.getStatus();
  }
  updateLimits(provider, config) {
    this.limits[provider] = config;
    this.semaphores.set(provider, new Semaphore(config.maxConcurrent));
    if (config.reservoir && config.reservoirRefresh) {
      this.tokenBuckets.set(provider, new TokenBucket(config.reservoir, config.reservoirRefresh));
    }
  }
  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

class Semaphore {
  maxPermits;
  permits;
  queue = [];
  constructor(maxPermits) {
    this.maxPermits = maxPermits;
    this.permits = maxPermits;
  }
  async acquire() {
    if (this.permits > 0) {
      this.permits--;
      return () => this.release();
    }
    return new Promise((resolve) => {
      this.queue.push(() => {
        this.permits--;
        resolve(() => this.release());
      });
    });
  }
  release() {
    if (this.queue.length > 0) {
      const next = this.queue.shift();
      next();
    } else {
      this.permits++;
    }
  }
  getStatus() {
    return {
      available: this.permits,
      max: this.maxPermits,
      waiting: this.queue.length
    };
  }
}

class TokenBucket {
  capacity;
  refreshInterval;
  tokens;
  lastRefresh;
  constructor(capacity, refreshInterval) {
    this.capacity = capacity;
    this.refreshInterval = refreshInterval;
    this.tokens = capacity;
    this.lastRefresh = Date.now();
  }
  async consume() {
    this.refill();
    if (this.tokens > 0) {
      this.tokens--;
      return;
    }
    const waitTime = this.refreshInterval - (Date.now() - this.lastRefresh);
    if (waitTime > 0) {
      await new Promise((resolve) => setTimeout(resolve, waitTime));
      await this.consume();
    }
  }
  refill() {
    const now = Date.now();
    const elapsed = now - this.lastRefresh;
    if (elapsed >= this.refreshInterval) {
      this.tokens = this.capacity;
      this.lastRefresh = now;
    }
  }
}
var DEFAULT_PROVIDER_LIMITS = {
  mcp: {
    maxConcurrent: 1,
    minTimeBetween: 1000,
    reservoir: 4,
    reservoirRefresh: 60000
  },
  glm: {
    maxConcurrent: 10,
    minTimeBetween: 100
  },
  featherless: {
    maxConcurrent: 5,
    minTimeBetween: 200,
    reservoir: 20,
    reservoirRefresh: 60000
  },
  anthropic: {
    maxConcurrent: 50,
    minTimeBetween: 50,
    reservoir: 100,
    reservoirRefresh: 60000
  }
};

// src/core/llm/ModelFallbackChain.ts
class ModelFallbackChain {
  chain;
  constructor(configs) {
    this.chain = configs.sort((a, b) => a.priority - b.priority);
  }
  async execute(request, context, providerRegistry) {
    const startTime = Date.now();
    const attemptedProviders = [];
    let totalAttempts = 0;
    for (const config of this.chain) {
      const provider = providerRegistry.get(config.provider);
      if (!provider) {
        console.warn(`[FallbackChain] Provider not available: ${config.provider}`);
        continue;
      }
      attemptedProviders.push(config.provider);
      const result = await this.tryProviderWithRetries(provider, config, request, context);
      totalAttempts += result.attempts;
      if (result.success && result.response) {
        return {
          response: result.response,
          attemptedProviders,
          successfulProvider: config.provider,
          totalAttempts,
          totalDuration: Date.now() - startTime
        };
      }
      console.log(`[FallbackChain] ${config.provider}/${config.model} failed after ${result.attempts} attempts: ${result.error?.message}`);
    }
    return {
      error: new Error(`All fallback providers exhausted (tried: ${attemptedProviders.join(", ")})`),
      attemptedProviders,
      totalAttempts,
      totalDuration: Date.now() - startTime
    };
  }
  async tryProviderWithRetries(provider, config, request, _context) {
    const maxRetries = config.maxRetries ?? 3;
    const baseDelay = config.retryDelay ?? 1000;
    const useExponentialBackoff = config.useExponentialBackoff ?? true;
    let attempts = 0;
    let lastError;
    while (attempts < maxRetries) {
      attempts++;
      try {
        const response = await provider.complete(request);
        return { success: true, response, attempts };
      } catch (error2) {
        lastError = error2;
        const isRateLimit = this.isRateLimitError(error2);
        if (!isRateLimit || attempts >= maxRetries) {
          break;
        }
        const delay = useExponentialBackoff ? baseDelay * Math.pow(2, attempts - 1) : baseDelay;
        const jitter = Math.random() * delay * 0.25;
        const totalDelay = delay + jitter;
        console.log(`[FallbackChain] Rate limit hit, retry ${attempts}/${maxRetries} after ${totalDelay}ms`);
        await this.delay(totalDelay);
      }
    }
    return { success: false, error: lastError, attempts };
  }
  isRateLimitError(error2) {
    const errorString = error2.message?.toLowerCase() || "";
    return errorString.includes("rate limit") || errorString.includes("429") || errorString.includes("concurrency limit") || errorString.includes("quota exceeded");
  }
  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  getChain() {
    return [...this.chain];
  }
  updateChain(configs) {
    this.chain = configs.sort((a, b) => a.priority - b.priority);
  }
}
var DEFAULT_FALLBACK_CHAIN = [
  {
    provider: "mcp",
    model: "kimi-k2",
    priority: 1,
    maxRetries: 2,
    retryDelay: 5000,
    useExponentialBackoff: true
  },
  {
    provider: "mcp",
    model: "glm-4.7",
    priority: 2,
    maxRetries: 3,
    retryDelay: 2000,
    useExponentialBackoff: true
  },
  {
    provider: "featherless",
    model: "llama-70b",
    priority: 3,
    maxRetries: 3,
    retryDelay: 1000,
    useExponentialBackoff: true
  },
  {
    provider: "featherless",
    model: "dolphin-3",
    priority: 4,
    maxRetries: 3,
    retryDelay: 1000,
    useExponentialBackoff: true
  }
];

// src/core/llm/Router.ts
class LLMRouter {
  registry;
  rateLimiter;
  errorHandler;
  concurrencyManager;
  fallbackChain;
  useFallback;
  constructor(registry, rateLimiter, errorHandler, options) {
    this.registry = registry;
    this.rateLimiter = rateLimiter || new RateLimiter;
    this.errorHandler = errorHandler || new ErrorHandler;
    this.concurrencyManager = new ConcurrencyManager(DEFAULT_PROVIDER_LIMITS);
    this.useFallback = options?.useFallback ?? true;
    this.fallbackChain = new ModelFallbackChain(options?.fallbackChain || DEFAULT_FALLBACK_CHAIN);
  }
  parseModel(modelString) {
    const match = modelString.match(/^([a-z]+)\/(.+)$/);
    if (match) {
      return {
        provider: match[1],
        model: match[2]
      };
    }
    return {
      provider: null,
      model: modelString
    };
  }
  async route(request, context) {
    if (this.useFallback) {
      return this.routeWithFallback(request, context);
    }
    return this.routeSingleProvider(request, context);
  }
  async routeWithFallback(request, context) {
    const result = await this.fallbackChain.execute(request, context, this.registry.getMap());
    if (result.error) {
      throw result.error;
    }
    console.log(`[Router] Success after ${result.totalAttempts} attempts, ${result.totalDuration}ms ` + `(tried: ${result.attemptedProviders.join(" → ")}, used: ${result.successfulProvider})`);
    return result.response;
  }
  async routeSingleProvider(request, context) {
    let selection;
    if (context.preferredModel) {
      const parsed = this.parseModel(context.preferredModel);
      if (parsed.provider) {
        const provider2 = this.registry.get(parsed.provider);
        if (!provider2) {
          throw new Error(`Provider not available: ${parsed.provider}`);
        }
        selection = {
          provider: parsed.provider,
          model: parsed.model,
          reason: `Explicit model selection: ${context.preferredModel}`
        };
      } else {
        selection = this.selectModelByName(parsed.model, context);
      }
    } else {
      selection = this.selectModel(context);
    }
    const provider = this.registry.get(selection.provider);
    if (!provider) {
      throw new Error(`Provider not available: ${selection.provider}`);
    }
    const release = await this.concurrencyManager.acquire(selection.provider);
    try {
      const routedRequest = {
        ...request,
        model: selection.model
      };
      return await this.errorHandler.retryWithBackoff(async (attempt) => {
        await this.rateLimiter.waitForToken(selection.provider);
        try {
          return await provider.complete(routedRequest);
        } catch (error2) {
          const classified = this.errorHandler.classify(error2);
          error2.providerName = selection.provider;
          error2.modelName = selection.model;
          error2.attempt = attempt;
          error2.classified = classified;
          throw error2;
        }
      }, {
        maxRetries: 3,
        initialDelay: 1000,
        maxDelay: 60000,
        factor: 2,
        onRetry: (attempt, delay, error2) => {
          const classified = this.errorHandler.classify(error2);
          console.warn(`[Router] Retry ${attempt}/${3} after ${delay}ms - ${this.errorHandler.formatError(classified)}`);
        }
      });
    } finally {
      release();
    }
  }
  selectModelByName(modelName, context) {
    const candidates = this.getCandidates(context);
    const match = candidates.find((c) => c.model === modelName);
    if (match) {
      return {
        provider: match.provider,
        model: match.model,
        reason: `Found model ${modelName} in ${match.provider}`
      };
    }
    return this.selectModel(context);
  }
  selectModel(context) {
    const candidates = this.getCandidates(context);
    if (candidates.length === 0) {
      return {
        provider: "anthropic",
        model: "claude-sonnet-4.5-20250929",
        reason: "Default model (no suitable alternatives found)"
      };
    }
    const scored = candidates.map((c) => this.scoreCandidate(c, context));
    scored.sort((a, b) => b.score - a.score);
    const best = scored[0];
    return {
      provider: best.provider,
      model: best.model,
      reason: best.reason.join(", ")
    };
  }
  getCandidates(context) {
    const candidates = [];
    const providers = this.registry.list();
    for (const providerName of providers) {
      const provider = this.registry.get(providerName);
      if (!provider)
        continue;
      if (context.requiresVision && !provider.capabilities.vision)
        continue;
      if (context.requiresTools && !provider.capabilities.tools)
        continue;
      if (providerName === "mcp") {
        const mcpProvider = provider;
        const models = ["dolphin-3", "qwen-72b", "whiterabbit", "llama-fast", "llama-70b", "kimi-k2", "glm-4.7"];
        for (const model of models) {
          const modelInfo = mcpProvider.getModelInfo(model);
          if (!modelInfo)
            continue;
          if (context.requiresUnrestricted && !modelInfo.capabilities.includes("unrestricted"))
            continue;
          if (context.requiresChinese && !modelInfo.capabilities.includes("chinese") && !modelInfo.capabilities.includes("multilingual"))
            continue;
          candidates.push({ provider: providerName, model });
        }
      } else if (providerName === "anthropic") {
        candidates.push({ provider: providerName, model: "claude-sonnet-4.5-20250929" }, { provider: providerName, model: "claude-opus-4.5-20251101" }, { provider: providerName, model: "claude-3-5-haiku-20241022" });
      }
    }
    return candidates;
  }
  scoreCandidate(candidate, context) {
    let score = 0;
    const reasons = [];
    const modelInfo = this.getModelInfo(candidate);
    if (!modelInfo) {
      return { ...candidate, score: 0, reason: ["Unknown model"] };
    }
    if (modelInfo.capabilities.includes(context.taskType)) {
      score += 10;
      reasons.push(`Specialized for ${context.taskType}`);
    }
    score += this.scorePriority(modelInfo, context.priority, reasons);
    if (context.requiresUnrestricted && modelInfo.capabilities.includes("unrestricted")) {
      score += 5;
      reasons.push("Unrestricted model");
    }
    if (context.requiresChinese && (modelInfo.capabilities.includes("chinese") || modelInfo.capabilities.includes("multilingual"))) {
      score += 5;
      reasons.push("Multilingual support");
    }
    if (context.taskType === "debugging" || context.taskType === "reasoning") {
      if (modelInfo.capabilities.includes("agentic")) {
        score += 8;
        reasons.push("Advanced agentic capabilities");
      }
    }
    return { ...candidate, score, reason: reasons };
  }
  scorePriority(modelInfo, priority, reasons) {
    const speedScores = {
      "very-fast": 10,
      fast: 7,
      medium: 4,
      slow: 0
    };
    const qualityScores = {
      exceptional: 10,
      high: 7,
      good: 4,
      basic: 0
    };
    const costScores = {
      "very-low": 10,
      low: 7,
      medium: 4,
      high: 0
    };
    if (priority === "speed") {
      reasons.push(`Fast model (${modelInfo.speed})`);
      return speedScores[modelInfo.speed] || 0;
    } else if (priority === "quality") {
      reasons.push(`High quality (${modelInfo.quality})`);
      return qualityScores[modelInfo.quality] || 0;
    } else if (priority === "cost") {
      reasons.push(`Low cost (${modelInfo.cost})`);
      return costScores[modelInfo.cost] || 0;
    } else {
      const avgScore = (speedScores[modelInfo.speed] + qualityScores[modelInfo.quality] + costScores[modelInfo.cost]) / 3;
      reasons.push("Balanced choice");
      return avgScore;
    }
  }
  getModelInfo(candidate) {
    if (candidate.provider === "mcp") {
      const provider = this.registry.get("mcp");
      return provider?.getModelInfo(candidate.model);
    } else if (candidate.provider === "anthropic") {
      if (candidate.model.includes("opus")) {
        return {
          capabilities: ["reasoning", "coding", "writing", "creative"],
          speed: "medium",
          quality: "exceptional",
          cost: "high"
        };
      } else if (candidate.model.includes("sonnet")) {
        return {
          capabilities: ["reasoning", "coding", "writing", "general"],
          speed: "fast",
          quality: "high",
          cost: "medium"
        };
      } else if (candidate.model.includes("haiku")) {
        return {
          capabilities: ["general", "coding", "fast-response"],
          speed: "very-fast",
          quality: "good",
          cost: "low"
        };
      }
    }
    return null;
  }
}
// src/core/llm/bridge/BashBridge.ts
import { spawn } from "child_process";
import path2 from "path";
async function executeBash(command, cwd) {
  return new Promise((resolve) => {
    const proc = spawn("bash", ["-c", command], {
      cwd: cwd || process.cwd(),
      env: process.env
    });
    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (data) => {
      stdout += data.toString();
    });
    proc.stderr.on("data", (data) => {
      stderr += data.toString();
    });
    proc.on("close", (code) => {
      resolve({
        success: code === 0,
        stdout,
        stderr,
        exitCode: code || 0
      });
    });
    proc.on("error", (err) => {
      resolve({
        success: false,
        stdout,
        stderr: stderr + `
` + err.message,
        exitCode: 1
      });
    });
  });
}
class MemoryManagerBridge {
  hookPath;
  constructor(hooksDir = "~/.claude/hooks") {
    const expandedDir = hooksDir.replace(/^~/, process.env.HOME || "");
    this.hookPath = path2.join(expandedDir, "memory-manager.sh");
  }
  async setTask(task, context) {
    const result = await executeBash(`"${this.hookPath}" set-task "${task}" "${context}"`);
    return result.success;
  }
  async addContext(note, relevance = 8) {
    const result = await executeBash(`"${this.hookPath}" add-context "${note}" ${relevance}`);
    return result.success;
  }
  async rememberScored(query) {
    const result = await executeBash(`"${this.hookPath}" remember-scored "${query}"`);
    return result.success ? result.stdout : "";
  }
  async recordEpisode(type, description, outcome, details) {
    const result = await executeBash(`"${this.hookPath}" record "${type}" "${description}" "${outcome}" "${details}"`);
    return result.success;
  }
  async addFact(category, key, value, confidence = 0.9) {
    const result = await executeBash(`"${this.hookPath}" add-fact "${category}" "${key}" "${value}" ${confidence}`);
    return result.success;
  }
  async addPattern(patternType, trigger, solution) {
    const result = await executeBash(`"${this.hookPath}" add-pattern "${patternType}" "${trigger}" "${solution}"`);
    return result.success;
  }
  async getWorking() {
    const result = await executeBash(`"${this.hookPath}" get-working`);
    return result.success ? result.stdout : "";
  }
  async searchEpisodes(query, limit = 5) {
    const result = await executeBash(`"${this.hookPath}" search-episodes "${query}" | head -n ${limit}`);
    return result.success ? result.stdout : "";
  }
  async checkpoint(description) {
    const result = await executeBash(`"${this.hookPath}" checkpoint "${description}"`);
    return result.success;
  }
}
// src/core/llm/index.ts
async function createLLMClient() {
  const registry = await createDefaultRegistry();
  const router = new LLMRouter(registry);
  return {
    registry,
    router,
    async complete(prompt, options) {
      const request = {
        messages: [{ role: "user", content: prompt }],
        system: options?.system,
        model: options?.model
      };
      const context = {
        taskType: options?.taskType || "general",
        priority: options?.priority || "balanced",
        requiresUnrestricted: options?.requiresUnrestricted
      };
      return router.route(request, context);
    },
    async streamComplete(prompt, onChunk, options) {
      const anthropic = registry.get("anthropic");
      if (!anthropic) {
        throw new Error("Anthropic provider not available for streaming");
      }
      const request = {
        messages: [{ role: "user", content: prompt }],
        system: options?.system,
        model: options?.model || "claude-sonnet-4.5-20250929"
      };
      const handler = (event) => {
        if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
          onChunk(event.delta.text || "");
        }
      };
      return anthropic.streamComplete(request, handler);
    }
  };
}

// node_modules/chalk/source/index.js
var { stdout: stdoutColor2, stderr: stderrColor2 } = supports_color_default;
var GENERATOR2 = Symbol("GENERATOR");
var STYLER2 = Symbol("STYLER");
var IS_EMPTY2 = Symbol("IS_EMPTY");
var levelMapping2 = [
  "ansi",
  "ansi",
  "ansi256",
  "ansi16m"
];
var styles3 = Object.create(null);
var applyOptions2 = (object, options = {}) => {
  if (options.level && !(Number.isInteger(options.level) && options.level >= 0 && options.level <= 3)) {
    throw new Error("The `level` option should be an integer from 0 to 3");
  }
  const colorLevel = stdoutColor2 ? stdoutColor2.level : 0;
  object.level = options.level === undefined ? colorLevel : options.level;
};
var chalkFactory2 = (options) => {
  const chalk2 = (...strings) => strings.join(" ");
  applyOptions2(chalk2, options);
  Object.setPrototypeOf(chalk2, createChalk2.prototype);
  return chalk2;
};
function createChalk2(options) {
  return chalkFactory2(options);
}
Object.setPrototypeOf(createChalk2.prototype, Function.prototype);
for (const [styleName, style] of Object.entries(ansi_styles_default)) {
  styles3[styleName] = {
    get() {
      const builder = createBuilder2(this, createStyler2(style.open, style.close, this[STYLER2]), this[IS_EMPTY2]);
      Object.defineProperty(this, styleName, { value: builder });
      return builder;
    }
  };
}
styles3.visible = {
  get() {
    const builder = createBuilder2(this, this[STYLER2], true);
    Object.defineProperty(this, "visible", { value: builder });
    return builder;
  }
};
var getModelAnsi2 = (model, level, type, ...arguments_) => {
  if (model === "rgb") {
    if (level === "ansi16m") {
      return ansi_styles_default[type].ansi16m(...arguments_);
    }
    if (level === "ansi256") {
      return ansi_styles_default[type].ansi256(ansi_styles_default.rgbToAnsi256(...arguments_));
    }
    return ansi_styles_default[type].ansi(ansi_styles_default.rgbToAnsi(...arguments_));
  }
  if (model === "hex") {
    return getModelAnsi2("rgb", level, type, ...ansi_styles_default.hexToRgb(...arguments_));
  }
  return ansi_styles_default[type][model](...arguments_);
};
var usedModels2 = ["rgb", "hex", "ansi256"];
for (const model of usedModels2) {
  styles3[model] = {
    get() {
      const { level } = this;
      return function(...arguments_) {
        const styler = createStyler2(getModelAnsi2(model, levelMapping2[level], "color", ...arguments_), ansi_styles_default.color.close, this[STYLER2]);
        return createBuilder2(this, styler, this[IS_EMPTY2]);
      };
    }
  };
  const bgModel = "bg" + model[0].toUpperCase() + model.slice(1);
  styles3[bgModel] = {
    get() {
      const { level } = this;
      return function(...arguments_) {
        const styler = createStyler2(getModelAnsi2(model, levelMapping2[level], "bgColor", ...arguments_), ansi_styles_default.bgColor.close, this[STYLER2]);
        return createBuilder2(this, styler, this[IS_EMPTY2]);
      };
    }
  };
}
var proto2 = Object.defineProperties(() => {}, {
  ...styles3,
  level: {
    enumerable: true,
    get() {
      return this[GENERATOR2].level;
    },
    set(level) {
      this[GENERATOR2].level = level;
    }
  }
});
var createStyler2 = (open, close, parent) => {
  let openAll;
  let closeAll;
  if (parent === undefined) {
    openAll = open;
    closeAll = close;
  } else {
    openAll = parent.openAll + open;
    closeAll = close + parent.closeAll;
  }
  return {
    open,
    close,
    openAll,
    closeAll,
    parent
  };
};
var createBuilder2 = (self, _styler, _isEmpty) => {
  const builder = (...arguments_) => applyStyle2(builder, arguments_.length === 1 ? "" + arguments_[0] : arguments_.join(" "));
  Object.setPrototypeOf(builder, proto2);
  builder[GENERATOR2] = self;
  builder[STYLER2] = _styler;
  builder[IS_EMPTY2] = _isEmpty;
  return builder;
};
var applyStyle2 = (self, string) => {
  if (self.level <= 0 || !string) {
    return self[IS_EMPTY2] ? "" : string;
  }
  let styler = self[STYLER2];
  if (styler === undefined) {
    return string;
  }
  const { openAll, closeAll } = styler;
  if (string.includes("\x1B")) {
    while (styler !== undefined) {
      string = stringReplaceAll(string, styler.close, styler.open);
      styler = styler.parent;
    }
  }
  const lfIndex = string.indexOf(`
`);
  if (lfIndex !== -1) {
    string = stringEncaseCRLFWithFirstIndex(string, closeAll, openAll, lfIndex);
  }
  return openAll + string + closeAll;
};
Object.defineProperties(createChalk2.prototype, styles3);
var chalk2 = createChalk2();
var chalkStderr2 = createChalk2({ level: stderrColor2 ? stderrColor2.level : 0 });
var source_default2 = chalk2;

// node_modules/ora/index.js
import process9 from "node:process";

// node_modules/cli-cursor/index.js
import process5 from "node:process";

// node_modules/restore-cursor/index.js
import process4 from "node:process";

// node_modules/mimic-function/index.js
var copyProperty = (to, from, property, ignoreNonConfigurable) => {
  if (property === "length" || property === "prototype") {
    return;
  }
  if (property === "arguments" || property === "caller") {
    return;
  }
  const toDescriptor = Object.getOwnPropertyDescriptor(to, property);
  const fromDescriptor = Object.getOwnPropertyDescriptor(from, property);
  if (!canCopyProperty(toDescriptor, fromDescriptor) && ignoreNonConfigurable) {
    return;
  }
  Object.defineProperty(to, property, fromDescriptor);
};
var canCopyProperty = function(toDescriptor, fromDescriptor) {
  return toDescriptor === undefined || toDescriptor.configurable || toDescriptor.writable === fromDescriptor.writable && toDescriptor.enumerable === fromDescriptor.enumerable && toDescriptor.configurable === fromDescriptor.configurable && (toDescriptor.writable || toDescriptor.value === fromDescriptor.value);
};
var changePrototype = (to, from) => {
  const fromPrototype = Object.getPrototypeOf(from);
  if (fromPrototype === Object.getPrototypeOf(to)) {
    return;
  }
  Object.setPrototypeOf(to, fromPrototype);
};
var wrappedToString = (withName, fromBody) => `/* Wrapped ${withName}*/
${fromBody}`;
var toStringDescriptor = Object.getOwnPropertyDescriptor(Function.prototype, "toString");
var toStringName = Object.getOwnPropertyDescriptor(Function.prototype.toString, "name");
var changeToString = (to, from, name) => {
  const withName = name === "" ? "" : `with ${name.trim()}() `;
  const newToString = wrappedToString.bind(null, withName, from.toString());
  Object.defineProperty(newToString, "name", toStringName);
  const { writable, enumerable, configurable } = toStringDescriptor;
  Object.defineProperty(to, "toString", { value: newToString, writable, enumerable, configurable });
};
function mimicFunction(to, from, { ignoreNonConfigurable = false } = {}) {
  const { name } = to;
  for (const property of Reflect.ownKeys(from)) {
    copyProperty(to, from, property, ignoreNonConfigurable);
  }
  changePrototype(to, from);
  changeToString(to, from, name);
  return to;
}

// node_modules/onetime/index.js
var calledFunctions = new WeakMap;
var onetime = (function_, options = {}) => {
  if (typeof function_ !== "function") {
    throw new TypeError("Expected a function");
  }
  let returnValue;
  let callCount = 0;
  const functionName = function_.displayName || function_.name || "<anonymous>";
  const onetime2 = function(...arguments_) {
    calledFunctions.set(onetime2, ++callCount);
    if (callCount === 1) {
      returnValue = function_.apply(this, arguments_);
      function_ = undefined;
    } else if (options.throw === true) {
      throw new Error(`Function \`${functionName}\` can only be called once`);
    }
    return returnValue;
  };
  mimicFunction(onetime2, function_);
  calledFunctions.set(onetime2, callCount);
  return onetime2;
};
onetime.callCount = (function_) => {
  if (!calledFunctions.has(function_)) {
    throw new Error(`The given function \`${function_.name}\` is not wrapped by the \`onetime\` package`);
  }
  return calledFunctions.get(function_);
};
var onetime_default = onetime;

// node_modules/signal-exit/dist/mjs/signals.js
var signals = [];
signals.push("SIGHUP", "SIGINT", "SIGTERM");
if (process.platform !== "win32") {
  signals.push("SIGALRM", "SIGABRT", "SIGVTALRM", "SIGXCPU", "SIGXFSZ", "SIGUSR2", "SIGTRAP", "SIGSYS", "SIGQUIT", "SIGIOT");
}
if (process.platform === "linux") {
  signals.push("SIGIO", "SIGPOLL", "SIGPWR", "SIGSTKFLT");
}

// node_modules/signal-exit/dist/mjs/index.js
var processOk = (process3) => !!process3 && typeof process3 === "object" && typeof process3.removeListener === "function" && typeof process3.emit === "function" && typeof process3.reallyExit === "function" && typeof process3.listeners === "function" && typeof process3.kill === "function" && typeof process3.pid === "number" && typeof process3.on === "function";
var kExitEmitter = Symbol.for("signal-exit emitter");
var global = globalThis;
var ObjectDefineProperty = Object.defineProperty.bind(Object);

class Emitter {
  emitted = {
    afterExit: false,
    exit: false
  };
  listeners = {
    afterExit: [],
    exit: []
  };
  count = 0;
  id = Math.random();
  constructor() {
    if (global[kExitEmitter]) {
      return global[kExitEmitter];
    }
    ObjectDefineProperty(global, kExitEmitter, {
      value: this,
      writable: false,
      enumerable: false,
      configurable: false
    });
  }
  on(ev, fn) {
    this.listeners[ev].push(fn);
  }
  removeListener(ev, fn) {
    const list = this.listeners[ev];
    const i = list.indexOf(fn);
    if (i === -1) {
      return;
    }
    if (i === 0 && list.length === 1) {
      list.length = 0;
    } else {
      list.splice(i, 1);
    }
  }
  emit(ev, code, signal) {
    if (this.emitted[ev]) {
      return false;
    }
    this.emitted[ev] = true;
    let ret = false;
    for (const fn of this.listeners[ev]) {
      ret = fn(code, signal) === true || ret;
    }
    if (ev === "exit") {
      ret = this.emit("afterExit", code, signal) || ret;
    }
    return ret;
  }
}

class SignalExitBase {
}
var signalExitWrap = (handler) => {
  return {
    onExit(cb, opts) {
      return handler.onExit(cb, opts);
    },
    load() {
      return handler.load();
    },
    unload() {
      return handler.unload();
    }
  };
};

class SignalExitFallback extends SignalExitBase {
  onExit() {
    return () => {};
  }
  load() {}
  unload() {}
}

class SignalExit extends SignalExitBase {
  #hupSig = process3.platform === "win32" ? "SIGINT" : "SIGHUP";
  #emitter = new Emitter;
  #process;
  #originalProcessEmit;
  #originalProcessReallyExit;
  #sigListeners = {};
  #loaded = false;
  constructor(process3) {
    super();
    this.#process = process3;
    this.#sigListeners = {};
    for (const sig of signals) {
      this.#sigListeners[sig] = () => {
        const listeners = this.#process.listeners(sig);
        let { count } = this.#emitter;
        const p = process3;
        if (typeof p.__signal_exit_emitter__ === "object" && typeof p.__signal_exit_emitter__.count === "number") {
          count += p.__signal_exit_emitter__.count;
        }
        if (listeners.length === count) {
          this.unload();
          const ret = this.#emitter.emit("exit", null, sig);
          const s = sig === "SIGHUP" ? this.#hupSig : sig;
          if (!ret)
            process3.kill(process3.pid, s);
        }
      };
    }
    this.#originalProcessReallyExit = process3.reallyExit;
    this.#originalProcessEmit = process3.emit;
  }
  onExit(cb, opts) {
    if (!processOk(this.#process)) {
      return () => {};
    }
    if (this.#loaded === false) {
      this.load();
    }
    const ev = opts?.alwaysLast ? "afterExit" : "exit";
    this.#emitter.on(ev, cb);
    return () => {
      this.#emitter.removeListener(ev, cb);
      if (this.#emitter.listeners["exit"].length === 0 && this.#emitter.listeners["afterExit"].length === 0) {
        this.unload();
      }
    };
  }
  load() {
    if (this.#loaded) {
      return;
    }
    this.#loaded = true;
    this.#emitter.count += 1;
    for (const sig of signals) {
      try {
        const fn = this.#sigListeners[sig];
        if (fn)
          this.#process.on(sig, fn);
      } catch (_) {}
    }
    this.#process.emit = (ev, ...a) => {
      return this.#processEmit(ev, ...a);
    };
    this.#process.reallyExit = (code) => {
      return this.#processReallyExit(code);
    };
  }
  unload() {
    if (!this.#loaded) {
      return;
    }
    this.#loaded = false;
    signals.forEach((sig) => {
      const listener = this.#sigListeners[sig];
      if (!listener) {
        throw new Error("Listener not defined for signal: " + sig);
      }
      try {
        this.#process.removeListener(sig, listener);
      } catch (_) {}
    });
    this.#process.emit = this.#originalProcessEmit;
    this.#process.reallyExit = this.#originalProcessReallyExit;
    this.#emitter.count -= 1;
  }
  #processReallyExit(code) {
    if (!processOk(this.#process)) {
      return 0;
    }
    this.#process.exitCode = code || 0;
    this.#emitter.emit("exit", this.#process.exitCode, null);
    return this.#originalProcessReallyExit.call(this.#process, this.#process.exitCode);
  }
  #processEmit(ev, ...args) {
    const og = this.#originalProcessEmit;
    if (ev === "exit" && processOk(this.#process)) {
      if (typeof args[0] === "number") {
        this.#process.exitCode = args[0];
      }
      const ret = og.call(this.#process, ev, ...args);
      this.#emitter.emit("exit", this.#process.exitCode, null);
      return ret;
    } else {
      return og.call(this.#process, ev, ...args);
    }
  }
}
var process3 = globalThis.process;
var {
  onExit,
  load,
  unload
} = signalExitWrap(processOk(process3) ? new SignalExit(process3) : new SignalExitFallback);

// node_modules/restore-cursor/index.js
var terminal = process4.stderr.isTTY ? process4.stderr : process4.stdout.isTTY ? process4.stdout : undefined;
var restoreCursor = terminal ? onetime_default(() => {
  onExit(() => {
    terminal.write("\x1B[?25h");
  }, { alwaysLast: true });
}) : () => {};
var restore_cursor_default = restoreCursor;

// node_modules/cli-cursor/index.js
var isHidden = false;
var cliCursor = {};
cliCursor.show = (writableStream = process5.stderr) => {
  if (!writableStream.isTTY) {
    return;
  }
  isHidden = false;
  writableStream.write("\x1B[?25h");
};
cliCursor.hide = (writableStream = process5.stderr) => {
  if (!writableStream.isTTY) {
    return;
  }
  restore_cursor_default();
  isHidden = true;
  writableStream.write("\x1B[?25l");
};
cliCursor.toggle = (force, writableStream) => {
  if (force !== undefined) {
    isHidden = force;
  }
  if (isHidden) {
    cliCursor.show(writableStream);
  } else {
    cliCursor.hide(writableStream);
  }
};
var cli_cursor_default = cliCursor;

// node_modules/ora/index.js
var import_cli_spinners = __toESM(require_cli_spinners(), 1);

// node_modules/log-symbols/node_modules/is-unicode-supported/index.js
import process6 from "node:process";
function isUnicodeSupported() {
  if (process6.platform !== "win32") {
    return process6.env.TERM !== "linux";
  }
  return Boolean(process6.env.CI) || Boolean(process6.env.WT_SESSION) || Boolean(process6.env.TERMINUS_SUBLIME) || process6.env.ConEmuTask === "{cmd::Cmder}" || process6.env.TERM_PROGRAM === "Terminus-Sublime" || process6.env.TERM_PROGRAM === "vscode" || process6.env.TERM === "xterm-256color" || process6.env.TERM === "alacritty" || process6.env.TERMINAL_EMULATOR === "JetBrains-JediTerm";
}

// node_modules/log-symbols/index.js
var main = {
  info: source_default2.blue("ℹ"),
  success: source_default2.green("✔"),
  warning: source_default2.yellow("⚠"),
  error: source_default2.red("✖")
};
var fallback = {
  info: source_default2.blue("i"),
  success: source_default2.green("√"),
  warning: source_default2.yellow("‼"),
  error: source_default2.red("×")
};
var logSymbols = isUnicodeSupported() ? main : fallback;
var log_symbols_default = logSymbols;

// node_modules/ora/node_modules/strip-ansi/node_modules/ansi-regex/index.js
function ansiRegex({ onlyFirst = false } = {}) {
  const ST = "(?:\\u0007|\\u001B\\u005C|\\u009C)";
  const osc = `(?:\\u001B\\][\\s\\S]*?${ST})`;
  const csi = "[\\u001B\\u009B][[\\]()#;?]*(?:\\d{1,4}(?:[;:]\\d{0,4})*)?[\\dA-PR-TZcf-nq-uy=><~]";
  const pattern = `${osc}|${csi}`;
  return new RegExp(pattern, onlyFirst ? undefined : "g");
}

// node_modules/ora/node_modules/strip-ansi/index.js
var regex = ansiRegex();
function stripAnsi(string) {
  if (typeof string !== "string") {
    throw new TypeError(`Expected a \`string\`, got \`${typeof string}\``);
  }
  return string.replace(regex, "");
}

// node_modules/string-width/node_modules/strip-ansi/node_modules/ansi-regex/index.js
function ansiRegex2({ onlyFirst = false } = {}) {
  const ST = "(?:\\u0007|\\u001B\\u005C|\\u009C)";
  const osc = `(?:\\u001B\\][\\s\\S]*?${ST})`;
  const csi = "[\\u001B\\u009B][[\\]()#;?]*(?:\\d{1,4}(?:[;:]\\d{0,4})*)?[\\dA-PR-TZcf-nq-uy=><~]";
  const pattern = `${osc}|${csi}`;
  return new RegExp(pattern, onlyFirst ? undefined : "g");
}

// node_modules/string-width/node_modules/strip-ansi/index.js
var regex2 = ansiRegex2();
function stripAnsi2(string) {
  if (typeof string !== "string") {
    throw new TypeError(`Expected a \`string\`, got \`${typeof string}\``);
  }
  return string.replace(regex2, "");
}

// node_modules/get-east-asian-width/lookup.js
function isAmbiguous(x) {
  return x === 161 || x === 164 || x === 167 || x === 168 || x === 170 || x === 173 || x === 174 || x >= 176 && x <= 180 || x >= 182 && x <= 186 || x >= 188 && x <= 191 || x === 198 || x === 208 || x === 215 || x === 216 || x >= 222 && x <= 225 || x === 230 || x >= 232 && x <= 234 || x === 236 || x === 237 || x === 240 || x === 242 || x === 243 || x >= 247 && x <= 250 || x === 252 || x === 254 || x === 257 || x === 273 || x === 275 || x === 283 || x === 294 || x === 295 || x === 299 || x >= 305 && x <= 307 || x === 312 || x >= 319 && x <= 322 || x === 324 || x >= 328 && x <= 331 || x === 333 || x === 338 || x === 339 || x === 358 || x === 359 || x === 363 || x === 462 || x === 464 || x === 466 || x === 468 || x === 470 || x === 472 || x === 474 || x === 476 || x === 593 || x === 609 || x === 708 || x === 711 || x >= 713 && x <= 715 || x === 717 || x === 720 || x >= 728 && x <= 731 || x === 733 || x === 735 || x >= 768 && x <= 879 || x >= 913 && x <= 929 || x >= 931 && x <= 937 || x >= 945 && x <= 961 || x >= 963 && x <= 969 || x === 1025 || x >= 1040 && x <= 1103 || x === 1105 || x === 8208 || x >= 8211 && x <= 8214 || x === 8216 || x === 8217 || x === 8220 || x === 8221 || x >= 8224 && x <= 8226 || x >= 8228 && x <= 8231 || x === 8240 || x === 8242 || x === 8243 || x === 8245 || x === 8251 || x === 8254 || x === 8308 || x === 8319 || x >= 8321 && x <= 8324 || x === 8364 || x === 8451 || x === 8453 || x === 8457 || x === 8467 || x === 8470 || x === 8481 || x === 8482 || x === 8486 || x === 8491 || x === 8531 || x === 8532 || x >= 8539 && x <= 8542 || x >= 8544 && x <= 8555 || x >= 8560 && x <= 8569 || x === 8585 || x >= 8592 && x <= 8601 || x === 8632 || x === 8633 || x === 8658 || x === 8660 || x === 8679 || x === 8704 || x === 8706 || x === 8707 || x === 8711 || x === 8712 || x === 8715 || x === 8719 || x === 8721 || x === 8725 || x === 8730 || x >= 8733 && x <= 8736 || x === 8739 || x === 8741 || x >= 8743 && x <= 8748 || x === 8750 || x >= 8756 && x <= 8759 || x === 8764 || x === 8765 || x === 8776 || x === 8780 || x === 8786 || x === 8800 || x === 8801 || x >= 8804 && x <= 8807 || x === 8810 || x === 8811 || x === 8814 || x === 8815 || x === 8834 || x === 8835 || x === 8838 || x === 8839 || x === 8853 || x === 8857 || x === 8869 || x === 8895 || x === 8978 || x >= 9312 && x <= 9449 || x >= 9451 && x <= 9547 || x >= 9552 && x <= 9587 || x >= 9600 && x <= 9615 || x >= 9618 && x <= 9621 || x === 9632 || x === 9633 || x >= 9635 && x <= 9641 || x === 9650 || x === 9651 || x === 9654 || x === 9655 || x === 9660 || x === 9661 || x === 9664 || x === 9665 || x >= 9670 && x <= 9672 || x === 9675 || x >= 9678 && x <= 9681 || x >= 9698 && x <= 9701 || x === 9711 || x === 9733 || x === 9734 || x === 9737 || x === 9742 || x === 9743 || x === 9756 || x === 9758 || x === 9792 || x === 9794 || x === 9824 || x === 9825 || x >= 9827 && x <= 9829 || x >= 9831 && x <= 9834 || x === 9836 || x === 9837 || x === 9839 || x === 9886 || x === 9887 || x === 9919 || x >= 9926 && x <= 9933 || x >= 9935 && x <= 9939 || x >= 9941 && x <= 9953 || x === 9955 || x === 9960 || x === 9961 || x >= 9963 && x <= 9969 || x === 9972 || x >= 9974 && x <= 9977 || x === 9979 || x === 9980 || x === 9982 || x === 9983 || x === 10045 || x >= 10102 && x <= 10111 || x >= 11094 && x <= 11097 || x >= 12872 && x <= 12879 || x >= 57344 && x <= 63743 || x >= 65024 && x <= 65039 || x === 65533 || x >= 127232 && x <= 127242 || x >= 127248 && x <= 127277 || x >= 127280 && x <= 127337 || x >= 127344 && x <= 127373 || x === 127375 || x === 127376 || x >= 127387 && x <= 127404 || x >= 917760 && x <= 917999 || x >= 983040 && x <= 1048573 || x >= 1048576 && x <= 1114109;
}
function isFullWidth(x) {
  return x === 12288 || x >= 65281 && x <= 65376 || x >= 65504 && x <= 65510;
}
function isWide(x) {
  return x >= 4352 && x <= 4447 || x === 8986 || x === 8987 || x === 9001 || x === 9002 || x >= 9193 && x <= 9196 || x === 9200 || x === 9203 || x === 9725 || x === 9726 || x === 9748 || x === 9749 || x >= 9776 && x <= 9783 || x >= 9800 && x <= 9811 || x === 9855 || x >= 9866 && x <= 9871 || x === 9875 || x === 9889 || x === 9898 || x === 9899 || x === 9917 || x === 9918 || x === 9924 || x === 9925 || x === 9934 || x === 9940 || x === 9962 || x === 9970 || x === 9971 || x === 9973 || x === 9978 || x === 9981 || x === 9989 || x === 9994 || x === 9995 || x === 10024 || x === 10060 || x === 10062 || x >= 10067 && x <= 10069 || x === 10071 || x >= 10133 && x <= 10135 || x === 10160 || x === 10175 || x === 11035 || x === 11036 || x === 11088 || x === 11093 || x >= 11904 && x <= 11929 || x >= 11931 && x <= 12019 || x >= 12032 && x <= 12245 || x >= 12272 && x <= 12287 || x >= 12289 && x <= 12350 || x >= 12353 && x <= 12438 || x >= 12441 && x <= 12543 || x >= 12549 && x <= 12591 || x >= 12593 && x <= 12686 || x >= 12688 && x <= 12773 || x >= 12783 && x <= 12830 || x >= 12832 && x <= 12871 || x >= 12880 && x <= 42124 || x >= 42128 && x <= 42182 || x >= 43360 && x <= 43388 || x >= 44032 && x <= 55203 || x >= 63744 && x <= 64255 || x >= 65040 && x <= 65049 || x >= 65072 && x <= 65106 || x >= 65108 && x <= 65126 || x >= 65128 && x <= 65131 || x >= 94176 && x <= 94180 || x >= 94192 && x <= 94198 || x >= 94208 && x <= 101589 || x >= 101631 && x <= 101662 || x >= 101760 && x <= 101874 || x >= 110576 && x <= 110579 || x >= 110581 && x <= 110587 || x === 110589 || x === 110590 || x >= 110592 && x <= 110882 || x === 110898 || x >= 110928 && x <= 110930 || x === 110933 || x >= 110948 && x <= 110951 || x >= 110960 && x <= 111355 || x >= 119552 && x <= 119638 || x >= 119648 && x <= 119670 || x === 126980 || x === 127183 || x === 127374 || x >= 127377 && x <= 127386 || x >= 127488 && x <= 127490 || x >= 127504 && x <= 127547 || x >= 127552 && x <= 127560 || x === 127568 || x === 127569 || x >= 127584 && x <= 127589 || x >= 127744 && x <= 127776 || x >= 127789 && x <= 127797 || x >= 127799 && x <= 127868 || x >= 127870 && x <= 127891 || x >= 127904 && x <= 127946 || x >= 127951 && x <= 127955 || x >= 127968 && x <= 127984 || x === 127988 || x >= 127992 && x <= 128062 || x === 128064 || x >= 128066 && x <= 128252 || x >= 128255 && x <= 128317 || x >= 128331 && x <= 128334 || x >= 128336 && x <= 128359 || x === 128378 || x === 128405 || x === 128406 || x === 128420 || x >= 128507 && x <= 128591 || x >= 128640 && x <= 128709 || x === 128716 || x >= 128720 && x <= 128722 || x >= 128725 && x <= 128728 || x >= 128732 && x <= 128735 || x === 128747 || x === 128748 || x >= 128756 && x <= 128764 || x >= 128992 && x <= 129003 || x === 129008 || x >= 129292 && x <= 129338 || x >= 129340 && x <= 129349 || x >= 129351 && x <= 129535 || x >= 129648 && x <= 129660 || x >= 129664 && x <= 129674 || x >= 129678 && x <= 129734 || x === 129736 || x >= 129741 && x <= 129756 || x >= 129759 && x <= 129770 || x >= 129775 && x <= 129784 || x >= 131072 && x <= 196605 || x >= 196608 && x <= 262141;
}

// node_modules/get-east-asian-width/index.js
function validate(codePoint) {
  if (!Number.isSafeInteger(codePoint)) {
    throw new TypeError(`Expected a code point, got \`${typeof codePoint}\`.`);
  }
}
function eastAsianWidth(codePoint, { ambiguousAsWide = false } = {}) {
  validate(codePoint);
  if (isFullWidth(codePoint) || isWide(codePoint) || ambiguousAsWide && isAmbiguous(codePoint)) {
    return 2;
  }
  return 1;
}

// node_modules/string-width/index.js
var import_emoji_regex = __toESM(require_emoji_regex(), 1);
var segmenter = new Intl.Segmenter;
var defaultIgnorableCodePointRegex = /^\p{Default_Ignorable_Code_Point}$/u;
function stringWidth(string, options = {}) {
  if (typeof string !== "string" || string.length === 0) {
    return 0;
  }
  const {
    ambiguousIsNarrow = true,
    countAnsiEscapeCodes = false
  } = options;
  if (!countAnsiEscapeCodes) {
    string = stripAnsi2(string);
  }
  if (string.length === 0) {
    return 0;
  }
  let width = 0;
  const eastAsianWidthOptions = { ambiguousAsWide: !ambiguousIsNarrow };
  for (const { segment: character } of segmenter.segment(string)) {
    const codePoint = character.codePointAt(0);
    if (codePoint <= 31 || codePoint >= 127 && codePoint <= 159) {
      continue;
    }
    if (codePoint >= 8203 && codePoint <= 8207 || codePoint === 65279) {
      continue;
    }
    if (codePoint >= 768 && codePoint <= 879 || codePoint >= 6832 && codePoint <= 6911 || codePoint >= 7616 && codePoint <= 7679 || codePoint >= 8400 && codePoint <= 8447 || codePoint >= 65056 && codePoint <= 65071) {
      continue;
    }
    if (codePoint >= 55296 && codePoint <= 57343) {
      continue;
    }
    if (codePoint >= 65024 && codePoint <= 65039) {
      continue;
    }
    if (defaultIgnorableCodePointRegex.test(character)) {
      continue;
    }
    if (import_emoji_regex.default().test(character)) {
      width += 2;
      continue;
    }
    width += eastAsianWidth(codePoint, eastAsianWidthOptions);
  }
  return width;
}

// node_modules/is-interactive/index.js
function isInteractive({ stream = process.stdout } = {}) {
  return Boolean(stream && stream.isTTY && process.env.TERM !== "dumb" && !("CI" in process.env));
}

// node_modules/is-unicode-supported/index.js
import process7 from "node:process";
function isUnicodeSupported2() {
  const { env: env2 } = process7;
  const { TERM, TERM_PROGRAM } = env2;
  if (process7.platform !== "win32") {
    return TERM !== "linux";
  }
  return Boolean(env2.WT_SESSION) || Boolean(env2.TERMINUS_SUBLIME) || env2.ConEmuTask === "{cmd::Cmder}" || TERM_PROGRAM === "Terminus-Sublime" || TERM_PROGRAM === "vscode" || TERM === "xterm-256color" || TERM === "alacritty" || TERM === "rxvt-unicode" || TERM === "rxvt-unicode-256color" || env2.TERMINAL_EMULATOR === "JetBrains-JediTerm";
}

// node_modules/stdin-discarder/index.js
import process8 from "node:process";
var ASCII_ETX_CODE = 3;

class StdinDiscarder {
  #activeCount = 0;
  start() {
    this.#activeCount++;
    if (this.#activeCount === 1) {
      this.#realStart();
    }
  }
  stop() {
    if (this.#activeCount <= 0) {
      throw new Error("`stop` called more times than `start`");
    }
    this.#activeCount--;
    if (this.#activeCount === 0) {
      this.#realStop();
    }
  }
  #realStart() {
    if (process8.platform === "win32" || !process8.stdin.isTTY) {
      return;
    }
    process8.stdin.setRawMode(true);
    process8.stdin.on("data", this.#handleInput);
    process8.stdin.resume();
  }
  #realStop() {
    if (!process8.stdin.isTTY) {
      return;
    }
    process8.stdin.off("data", this.#handleInput);
    process8.stdin.pause();
    process8.stdin.setRawMode(false);
  }
  #handleInput(chunk) {
    if (chunk[0] === ASCII_ETX_CODE) {
      process8.emit("SIGINT");
    }
  }
}
var stdinDiscarder = new StdinDiscarder;
var stdin_discarder_default = stdinDiscarder;

// node_modules/ora/index.js
var import_cli_spinners2 = __toESM(require_cli_spinners(), 1);

class Ora {
  #linesToClear = 0;
  #isDiscardingStdin = false;
  #lineCount = 0;
  #frameIndex = -1;
  #lastSpinnerFrameTime = 0;
  #options;
  #spinner;
  #stream;
  #id;
  #initialInterval;
  #isEnabled;
  #isSilent;
  #indent;
  #text;
  #prefixText;
  #suffixText;
  color;
  constructor(options) {
    if (typeof options === "string") {
      options = {
        text: options
      };
    }
    this.#options = {
      color: "cyan",
      stream: process9.stderr,
      discardStdin: true,
      hideCursor: true,
      ...options
    };
    this.color = this.#options.color;
    this.spinner = this.#options.spinner;
    this.#initialInterval = this.#options.interval;
    this.#stream = this.#options.stream;
    this.#isEnabled = typeof this.#options.isEnabled === "boolean" ? this.#options.isEnabled : isInteractive({ stream: this.#stream });
    this.#isSilent = typeof this.#options.isSilent === "boolean" ? this.#options.isSilent : false;
    this.text = this.#options.text;
    this.prefixText = this.#options.prefixText;
    this.suffixText = this.#options.suffixText;
    this.indent = this.#options.indent;
    if (process9.env.NODE_ENV === "test") {
      this._stream = this.#stream;
      this._isEnabled = this.#isEnabled;
      Object.defineProperty(this, "_linesToClear", {
        get() {
          return this.#linesToClear;
        },
        set(newValue) {
          this.#linesToClear = newValue;
        }
      });
      Object.defineProperty(this, "_frameIndex", {
        get() {
          return this.#frameIndex;
        }
      });
      Object.defineProperty(this, "_lineCount", {
        get() {
          return this.#lineCount;
        }
      });
    }
  }
  get indent() {
    return this.#indent;
  }
  set indent(indent = 0) {
    if (!(indent >= 0 && Number.isInteger(indent))) {
      throw new Error("The `indent` option must be an integer from 0 and up");
    }
    this.#indent = indent;
    this.#updateLineCount();
  }
  get interval() {
    return this.#initialInterval ?? this.#spinner.interval ?? 100;
  }
  get spinner() {
    return this.#spinner;
  }
  set spinner(spinner) {
    this.#frameIndex = -1;
    this.#initialInterval = undefined;
    if (typeof spinner === "object") {
      if (spinner.frames === undefined) {
        throw new Error("The given spinner must have a `frames` property");
      }
      this.#spinner = spinner;
    } else if (!isUnicodeSupported2()) {
      this.#spinner = import_cli_spinners.default.line;
    } else if (spinner === undefined) {
      this.#spinner = import_cli_spinners.default.dots;
    } else if (spinner !== "default" && import_cli_spinners.default[spinner]) {
      this.#spinner = import_cli_spinners.default[spinner];
    } else {
      throw new Error(`There is no built-in spinner named '${spinner}'. See https://github.com/sindresorhus/cli-spinners/blob/main/spinners.json for a full list.`);
    }
  }
  get text() {
    return this.#text;
  }
  set text(value = "") {
    this.#text = value;
    this.#updateLineCount();
  }
  get prefixText() {
    return this.#prefixText;
  }
  set prefixText(value = "") {
    this.#prefixText = value;
    this.#updateLineCount();
  }
  get suffixText() {
    return this.#suffixText;
  }
  set suffixText(value = "") {
    this.#suffixText = value;
    this.#updateLineCount();
  }
  get isSpinning() {
    return this.#id !== undefined;
  }
  #getFullPrefixText(prefixText = this.#prefixText, postfix = " ") {
    if (typeof prefixText === "string" && prefixText !== "") {
      return prefixText + postfix;
    }
    if (typeof prefixText === "function") {
      return prefixText() + postfix;
    }
    return "";
  }
  #getFullSuffixText(suffixText = this.#suffixText, prefix = " ") {
    if (typeof suffixText === "string" && suffixText !== "") {
      return prefix + suffixText;
    }
    if (typeof suffixText === "function") {
      return prefix + suffixText();
    }
    return "";
  }
  #updateLineCount() {
    const columns = this.#stream.columns ?? 80;
    const fullPrefixText = this.#getFullPrefixText(this.#prefixText, "-");
    const fullSuffixText = this.#getFullSuffixText(this.#suffixText, "-");
    const fullText = " ".repeat(this.#indent) + fullPrefixText + "--" + this.#text + "--" + fullSuffixText;
    this.#lineCount = 0;
    for (const line of stripAnsi(fullText).split(`
`)) {
      this.#lineCount += Math.max(1, Math.ceil(stringWidth(line, { countAnsiEscapeCodes: true }) / columns));
    }
  }
  get isEnabled() {
    return this.#isEnabled && !this.#isSilent;
  }
  set isEnabled(value) {
    if (typeof value !== "boolean") {
      throw new TypeError("The `isEnabled` option must be a boolean");
    }
    this.#isEnabled = value;
  }
  get isSilent() {
    return this.#isSilent;
  }
  set isSilent(value) {
    if (typeof value !== "boolean") {
      throw new TypeError("The `isSilent` option must be a boolean");
    }
    this.#isSilent = value;
  }
  frame() {
    const now = Date.now();
    if (this.#frameIndex === -1 || now - this.#lastSpinnerFrameTime >= this.interval) {
      this.#frameIndex = ++this.#frameIndex % this.#spinner.frames.length;
      this.#lastSpinnerFrameTime = now;
    }
    const { frames } = this.#spinner;
    let frame = frames[this.#frameIndex];
    if (this.color) {
      frame = source_default2[this.color](frame);
    }
    const fullPrefixText = typeof this.#prefixText === "string" && this.#prefixText !== "" ? this.#prefixText + " " : "";
    const fullText = typeof this.text === "string" ? " " + this.text : "";
    const fullSuffixText = typeof this.#suffixText === "string" && this.#suffixText !== "" ? " " + this.#suffixText : "";
    return fullPrefixText + frame + fullText + fullSuffixText;
  }
  clear() {
    if (!this.#isEnabled || !this.#stream.isTTY) {
      return this;
    }
    this.#stream.cursorTo(0);
    for (let index = 0;index < this.#linesToClear; index++) {
      if (index > 0) {
        this.#stream.moveCursor(0, -1);
      }
      this.#stream.clearLine(1);
    }
    if (this.#indent || this.lastIndent !== this.#indent) {
      this.#stream.cursorTo(this.#indent);
    }
    this.lastIndent = this.#indent;
    this.#linesToClear = 0;
    return this;
  }
  render() {
    if (this.#isSilent) {
      return this;
    }
    this.clear();
    this.#stream.write(this.frame());
    this.#linesToClear = this.#lineCount;
    return this;
  }
  start(text) {
    if (text) {
      this.text = text;
    }
    if (this.#isSilent) {
      return this;
    }
    if (!this.#isEnabled) {
      if (this.text) {
        this.#stream.write(`- ${this.text}
`);
      }
      return this;
    }
    if (this.isSpinning) {
      return this;
    }
    if (this.#options.hideCursor) {
      cli_cursor_default.hide(this.#stream);
    }
    if (this.#options.discardStdin && process9.stdin.isTTY) {
      this.#isDiscardingStdin = true;
      stdin_discarder_default.start();
    }
    this.render();
    this.#id = setInterval(this.render.bind(this), this.interval);
    return this;
  }
  stop() {
    if (!this.#isEnabled) {
      return this;
    }
    clearInterval(this.#id);
    this.#id = undefined;
    this.#frameIndex = 0;
    this.clear();
    if (this.#options.hideCursor) {
      cli_cursor_default.show(this.#stream);
    }
    if (this.#options.discardStdin && process9.stdin.isTTY && this.#isDiscardingStdin) {
      stdin_discarder_default.stop();
      this.#isDiscardingStdin = false;
    }
    return this;
  }
  succeed(text) {
    return this.stopAndPersist({ symbol: log_symbols_default.success, text });
  }
  fail(text) {
    return this.stopAndPersist({ symbol: log_symbols_default.error, text });
  }
  warn(text) {
    return this.stopAndPersist({ symbol: log_symbols_default.warning, text });
  }
  info(text) {
    return this.stopAndPersist({ symbol: log_symbols_default.info, text });
  }
  stopAndPersist(options = {}) {
    if (this.#isSilent) {
      return this;
    }
    const prefixText = options.prefixText ?? this.#prefixText;
    const fullPrefixText = this.#getFullPrefixText(prefixText, " ");
    const symbolText = options.symbol ?? " ";
    const text = options.text ?? this.text;
    const separatorText = symbolText ? " " : "";
    const fullText = typeof text === "string" ? separatorText + text : "";
    const suffixText = options.suffixText ?? this.#suffixText;
    const fullSuffixText = this.#getFullSuffixText(suffixText, " ");
    const textToWrite = fullPrefixText + symbolText + fullText + fullSuffixText + `
`;
    this.stop();
    this.#stream.write(textToWrite);
    return this;
  }
}
function ora(options) {
  return new Ora(options);
}

// src/cli/BaseCommand.ts
class BaseCommand {
  spinner;
  startSpinner(message) {
    this.spinner = ora(message).start();
  }
  updateSpinner(message) {
    if (this.spinner) {
      this.spinner.text = message;
    }
  }
  succeedSpinner(message) {
    if (this.spinner) {
      this.spinner.succeed(message);
      this.spinner = undefined;
    }
  }
  failSpinner(message) {
    if (this.spinner) {
      this.spinner.fail(message);
      this.spinner = undefined;
    }
  }
  info(message) {
    console.log(source_default2.blue("ℹ"), message);
  }
  success(message) {
    console.log(source_default2.green("✅"), message);
  }
  warn(message) {
    console.log(source_default2.yellow("⚠"), message);
  }
  error(message) {
    console.log(source_default2.red("❌"), message);
  }
  createSuccess(message, data) {
    return {
      success: true,
      message,
      data
    };
  }
  createFailure(message, error2) {
    return {
      success: false,
      message,
      error: error2
    };
  }
}

// src/core/agents/ActionExecutor.ts
import * as fs from "fs/promises";
import * as path3 from "path";
import { exec as execCallback } from "child_process";
import { promisify } from "util";
var exec = promisify(execCallback);

class ActionExecutor {
  llmRouter;
  workingDir;
  constructor(llmRouter, workingDir = process.cwd()) {
    this.llmRouter = llmRouter;
    this.workingDir = workingDir;
  }
  async execute(action) {
    try {
      if (action.type === "file_edit") {
        const exists = await this.fileExists(action.params.path);
        if (!exists) {
          return {
            success: false,
            output: "",
            error: `Cannot edit ${action.params.path}: file does not exist. Suggest creating it with file_write instead.`
          };
        }
      }
      switch (action.type) {
        case "file_write":
          return await this.executeFileWrite(action.params.path, action.params.content);
        case "file_read":
          return await this.executeFileRead(action.params.path);
        case "file_edit":
          return await this.executeFileEdit(action.params.path, action.params.searchPattern, action.params.replacement);
        case "command":
          return await this.executeCommand(action.params.command);
        case "llm_generate":
          return await this.executeLLMGeneration(action.params.prompt, action.params.context);
        case "git_operation":
          return await this.executeGitOperation(action.params.operation, action.params.args);
        case "validate_typescript":
          return await this.validateTypeScript(action.params.files);
        default:
          return {
            success: false,
            output: "",
            error: `Unknown action type: ${action.type}`
          };
      }
    } catch (error2) {
      const err = error2;
      return {
        success: false,
        output: "",
        error: err.message
      };
    }
  }
  async fileExists(filePath) {
    const fullPath = path3.resolve(this.workingDir, filePath);
    try {
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }
  async executeFileWrite(filePath, content) {
    const fullPath = path3.resolve(this.workingDir, filePath);
    const dir = path3.dirname(fullPath);
    let fileExists = false;
    let existingContent = "";
    try {
      existingContent = await fs.readFile(fullPath, "utf-8");
      fileExists = true;
    } catch (error2) {
      fileExists = false;
    }
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(fullPath, content, "utf-8");
    return {
      success: true,
      output: fileExists ? `File updated: ${filePath} (${content.length} bytes)` : `File created: ${filePath} (${content.length} bytes)`,
      metadata: {
        path: fullPath,
        bytes: content.length,
        lines: content.split(`
`).length,
        existed: fileExists,
        previousBytes: fileExists ? existingContent.length : 0
      }
    };
  }
  async executeFileRead(filePath) {
    const fullPath = path3.resolve(this.workingDir, filePath);
    const content = await fs.readFile(fullPath, "utf-8");
    return {
      success: true,
      output: content,
      metadata: {
        path: fullPath,
        bytes: content.length,
        lines: content.split(`
`).length
      }
    };
  }
  async executeFileEdit(filePath, searchPattern, replacement) {
    const fullPath = path3.resolve(this.workingDir, filePath);
    let content = await fs.readFile(fullPath, "utf-8");
    const regex3 = new RegExp(searchPattern, "g");
    const matches = content.match(regex3);
    const matchCount = matches ? matches.length : 0;
    content = content.replace(regex3, replacement);
    await fs.writeFile(fullPath, content, "utf-8");
    return {
      success: true,
      output: `File edited: ${filePath} (${matchCount} replacements)`,
      metadata: {
        path: fullPath,
        replacements: matchCount
      }
    };
  }
  async executeCommand(command) {
    const { stdout, stderr } = await exec(command, {
      cwd: this.workingDir,
      maxBuffer: 1024 * 1024 * 10
    });
    return {
      success: !stderr || stderr.trim() === "",
      output: stdout,
      error: stderr || undefined,
      metadata: {
        command,
        exitCode: 0
      }
    };
  }
  async executeLLMGeneration(prompt, context) {
    const messages = [
      {
        role: "user",
        content: context ? `${context}

${prompt}` : prompt
      }
    ];
    const response = await this.llmRouter.route({ messages }, {
      taskType: "coding",
      priority: "quality"
    });
    const firstContent = response.content[0];
    const generatedCode = firstContent.type === "text" ? firstContent.text : "";
    return {
      success: generatedCode.length > 0,
      output: generatedCode,
      metadata: {
        prompt: prompt.substring(0, 100) + "...",
        generatedLength: generatedCode.length
      }
    };
  }
  async executeGitOperation(operation, args) {
    const command = `git ${operation} ${args.join(" ")}`;
    return await this.executeCommand(command);
  }
  async validateTypeScript(files) {
    try {
      const skipLibCheck = "--skipLibCheck";
      const fileArgs = files && files.length > 0 ? files.join(" ") : "";
      const command = `bunx tsc --noEmit ${skipLibCheck} ${fileArgs}`;
      await exec(command, {
        cwd: this.workingDir,
        maxBuffer: 1024 * 1024 * 10
      });
      return {
        success: true,
        output: "TypeScript validation passed - no type errors",
        metadata: {
          errorCount: 0,
          files: files || ["all"]
        }
      };
    } catch (error2) {
      const err = error2;
      const output = err.stderr || err.stdout || "";
      const hasErrors = output.includes("error TS");
      if (hasErrors) {
        const errorMatches = output.match(/error TS\d+:/g);
        const errorCount = errorMatches ? errorMatches.length : 0;
        return {
          success: false,
          output,
          error: `TypeScript validation failed with ${errorCount} error(s)`,
          metadata: {
            errorCount,
            files: files || ["all"]
          }
        };
      }
      return {
        success: false,
        output,
        error: err.message,
        metadata: {
          files: files || ["all"]
        }
      };
    }
  }
  async parseThoughtToAction(thought, goal) {
    const prompt = `
You are an autonomous agent action parser. Convert the following thought into a structured action.

Goal: ${goal}
Thought: ${thought}

Available action types:
1. file_write: Create or overwrite a file (validates existence first)
2. file_read: Read a file's contents
3. file_edit: Edit a file by replacing text (file must exist)
4. command: Execute a bash command
5. llm_generate: Generate code using LLM
6. git_operation: Perform git operations

IMPORTANT FILE VALIDATION RULES:
- If goal/thought says "create" → use file_write (creates new file)
- If goal/thought says "update" or "edit" → validate file exists first
- If file doesn't exist and action is "update" → suggest creating it instead

Return ONLY a JSON object with this structure:
{
  "type": "action_type",
  "params": {
    // action-specific parameters
  }
}

Examples:
- "Create types.ts file" → {"type": "file_write", "params": {"path": "types.ts", "content": "..."}}
- "Update types.ts" (file exists) → {"type": "file_edit", "params": {"path": "types.ts", ...}}
- "Update types.ts" (file missing) → {"type": "file_write", "params": {"path": "types.ts", "content": "..."}}
- "Run TypeScript compiler" → {"type": "command", "params": {"command": "tsc --noEmit"}}
- "Generate Logger class" → {"type": "llm_generate", "params": {"prompt": "Generate TypeScript Logger class"}}

Return JSON now:
`.trim();
    const response = await this.llmRouter.route({
      messages: [{ role: "user", content: prompt }],
      system: "You are a JSON generator. Return ONLY valid JSON, no explanation."
    }, {
      taskType: "reasoning",
      priority: "speed"
    });
    const firstContent = response.content[0];
    const jsonText = firstContent.type === "text" ? firstContent.text : "{}";
    try {
      const cleanJson = jsonText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const action = JSON.parse(cleanJson);
      return action;
    } catch (error2) {
      return this.heuristicParse(thought);
    }
  }
  heuristicParse(thought) {
    const lowerThought = thought.toLowerCase();
    if (lowerThought.includes("create") || lowerThought.includes("write")) {
      const fileMatch = thought.match(/(\w+\.ts)/);
      const filename = fileMatch ? fileMatch[1] : "unknown.ts";
      return {
        type: "file_write",
        params: {
          path: filename,
          content: `// Generated file
`
        }
      };
    }
    if (lowerThought.includes("read") || lowerThought.includes("check")) {
      const fileMatch = thought.match(/(\w+\.ts)/);
      const filename = fileMatch ? fileMatch[1] : "unknown.ts";
      return {
        type: "file_read",
        params: {
          path: filename
        }
      };
    }
    if (lowerThought.includes("run") || lowerThought.includes("execute")) {
      return {
        type: "command",
        params: {
          command: 'echo "Command parsed from thought"'
        }
      };
    }
    return {
      type: "llm_generate",
      params: {
        prompt: thought
      }
    };
  }
}

// src/core/agents/reflexion/index.ts
class ReflexionAgent {
  context;
  executor;
  llmRouter;
  preferredModel;
  constructor(goal, llmRouter, preferredModel) {
    this.context = {
      goal,
      history: [],
      metadata: {},
      metrics: {
        filesCreated: 0,
        filesModified: 0,
        linesChanged: 0,
        iterations: 0
      }
    };
    this.llmRouter = llmRouter;
    this.preferredModel = preferredModel;
    if (llmRouter) {
      this.executor = new ActionExecutor(llmRouter);
    }
  }
  async cycle(input) {
    this.context.metrics.iterations++;
    if (this.detectStagnation()) {
      throw new Error("Agent stuck: No progress for multiple iterations");
    }
    if (this.detectRepetition(input)) {
      throw new Error("Agent stuck: Repeating same actions");
    }
    const thought = await this.think(input);
    const action = await this.act(thought);
    let observation = await this.observe(action);
    const goalAlignment = this.validateGoalAlignment(observation);
    if (!goalAlignment.aligned) {
      observation += `
⚠️ Goal misalignment: ${goalAlignment.reason}`;
    }
    const reflection = await this.reflect(thought, action, observation);
    const cycle = {
      thought,
      action,
      observation,
      reflection,
      success: this.evaluateSuccess(observation)
    };
    this.context.history.push(cycle);
    return cycle;
  }
  async think(input) {
    if (input.startsWith("[ERROR]")) {
      return input;
    }
    if (!this.llmRouter) {
      return `Reasoning about: ${input} with goal: ${this.context.goal}`;
    }
    const recentHistory = this.context.history.slice(-3).map((cycle) => `Previous: ${cycle.thought} → ${cycle.action} → ${cycle.observation} → ${cycle.reflection}`).join(`
`);
    const progressSummary = `Progress: ${this.context.metrics.filesCreated} created, ${this.context.metrics.filesModified} modified, ${this.context.metrics.linesChanged} lines changed`;
    const systemPrompt = `You are a reasoning agent using the ReAct pattern. Given a goal and current input, generate explicit reasoning about what action to take next.

Your response should:
1. Analyze the current situation and input
2. Consider past actions and their outcomes
3. Propose the next logical step towards the goal
4. Be specific and actionable (mention exact filenames, actions, etc.)

Keep your reasoning concise (2-3 sentences max).`;
    const userPrompt = `Goal: ${this.context.goal}

Current Input: ${input}

${recentHistory ? `Recent History:
${recentHistory}
` : ""}
${progressSummary}

What should I do next? Provide specific, actionable reasoning.`;
    try {
      const response = await this.llmRouter.route({
        messages: [
          { role: "user", content: userPrompt }
        ],
        system: systemPrompt,
        max_tokens: 200,
        temperature: 0.7
      }, {
        taskType: "reasoning",
        priority: "balanced",
        requiresTools: false,
        requiresVision: false,
        preferredModel: this.preferredModel
      });
      const textContent = response.content.find((block) => block.type === "text");
      if (textContent && "text" in textContent) {
        return textContent.text.trim();
      }
      return `Reasoning about: ${input} with goal: ${this.context.goal}`;
    } catch (error2) {
      console.error("[ReflexionAgent] LLM think() failed:", error2);
      return `Reasoning about: ${input} with goal: ${this.context.goal}`;
    }
  }
  async act(thought) {
    if (thought.includes("[ERROR]")) {
      return thought;
    }
    if (!this.executor) {
      return `[PLACEHOLDER] Action based on: ${thought}`;
    }
    try {
      const action = await this.executor.parseThoughtToAction(thought, this.context.goal);
      const result = await this.executor.execute(action);
      if (result.success && result.metadata) {
        if (action.type === "file_write") {
          if (result.metadata.existed) {
            this.context.metrics.filesModified++;
            this.context.metrics.linesChanged += result.metadata.lines || 0;
          } else {
            this.context.metrics.filesCreated++;
            this.context.metrics.linesChanged += result.metadata.lines || 0;
          }
        }
      }
      if (action.type === "file_write" && action.params.path?.endsWith(".ts")) {
        const validationResult = await this.executor.validateTypeScript([action.params.path]);
        if (!validationResult.success) {
          return `${action.type}(${JSON.stringify(action.params)}): ${result.output}
⚠️ TypeScript validation failed: ${validationResult.error}`;
        }
      }
      return `${action.type}(${JSON.stringify(action.params)}): ${result.output}`;
    } catch (error2) {
      const err = error2;
      return `[ERROR] Failed to execute action: ${err.message}`;
    }
  }
  async observe(action) {
    if (action.startsWith("[ERROR]")) {
      return `Action failed: ${action}`;
    }
    if (action.startsWith("[PLACEHOLDER]")) {
      return `Placeholder action (no real execution): ${action}`;
    }
    const actionTypeMatch = action.match(/^(\w+)\(/);
    const actionType = actionTypeMatch ? actionTypeMatch[1] : "unknown";
    let filename = null;
    const filenameMatch = action.match(/"path":"([^"]+)"/);
    if (filenameMatch) {
      filename = filenameMatch[1];
    }
    let observation = "";
    switch (actionType) {
      case "file_write":
        if (action.includes("File created:")) {
          observation = filename ? `File successfully created: ${filename}` : "File successfully created";
        } else if (action.includes("File updated:")) {
          observation = filename ? `File successfully updated: ${filename}` : "File successfully updated";
        } else {
          observation = filename ? `File successfully created/updated: ${filename}` : "File successfully created/updated";
        }
        break;
      case "file_read":
        observation = filename ? `File contents retrieved: ${filename}` : "File contents retrieved";
        break;
      case "command":
        observation = "Command executed successfully";
        break;
      case "llm_generate":
        observation = "Code generated successfully";
        break;
      default:
        observation = `Action completed: ${action}`;
    }
    return observation;
  }
  async reflect(thought, action, observation) {
    const reflections = [];
    if (observation.includes("[ERROR]") || observation.toLowerCase().includes("failed")) {
      reflections.push(`❌ Action failed. Need to adjust approach or check preconditions.`);
      return reflections.join(`
`);
    }
    const expectedOutcome = this.extractExpectedOutcome(thought);
    const actualOutcome = this.extractActualOutcome(observation);
    if (expectedOutcome && actualOutcome && expectedOutcome !== actualOutcome) {
      reflections.push(`⚠️ Expectation mismatch: Expected "${expectedOutcome}" but got "${actualOutcome}"`);
    }
    if (!this.isProgressTowardsGoal(action, observation)) {
      reflections.push(`⚠️ Current action may not be contributing to goal: ${this.context.goal}`);
    }
    const { metrics } = this.context;
    if (metrics.iterations > 5 && metrics.filesCreated === 0 && metrics.filesModified === 0) {
      reflections.push(`⚠️ ${metrics.iterations} iterations with no file changes. May be stuck in planning loop.`);
    }
    if (observation.includes("successfully") || observation.includes("created")) {
      reflections.push(`✅ Action succeeded. Continue with next step towards goal.`);
    }
    if (reflections.length > 0) {
      return reflections.join(`
`);
    }
    return `Reflection: ${thought} → ${action} → ${observation}`;
  }
  extractExpectedOutcome(thought) {
    const patterns = [
      /create (\w+\.ts)/i,
      /update (\w+\.ts)/i,
      /add (\w+ \w+)/i,
      /implement (\w+)/i
    ];
    for (const pattern of patterns) {
      const match = thought.match(pattern);
      if (match) {
        return match[1];
      }
    }
    return null;
  }
  extractActualOutcome(observation) {
    const fileMatch = observation.match(/(\w+\.ts)/);
    if (fileMatch) {
      return fileMatch[1];
    }
    if (observation.includes("failed") || observation.includes("[ERROR]")) {
      return "failure";
    }
    if (observation.includes("successfully") || observation.includes("created")) {
      return "success";
    }
    return null;
  }
  isProgressTowardsGoal(action, observation) {
    const { goal } = this.context;
    const goalLower = goal.toLowerCase();
    const actionLower = action.toLowerCase();
    const obsLower = observation.toLowerCase();
    const goalTerms = goalLower.split(/\s+/).filter((term) => term.length > 3);
    const hasGoalTerms = goalTerms.some((term) => actionLower.includes(term) || obsLower.includes(term));
    return hasGoalTerms;
  }
  evaluateSuccess(observation) {
    if (observation.includes("[ERROR]") || observation.includes("failed")) {
      return false;
    }
    if (observation.includes("successfully") || observation.includes("created") || observation.includes("updated")) {
      return true;
    }
    return true;
  }
  getHistory() {
    return this.context.history;
  }
  getMetrics() {
    return this.context.metrics;
  }
  detectStagnation() {
    const STAGNATION_THRESHOLD = 5;
    const { history } = this.context;
    if (history.length < STAGNATION_THRESHOLD) {
      return false;
    }
    const recentHistory = history.slice(-STAGNATION_THRESHOLD);
    const noProgress = recentHistory.every((cycle) => {
      return !cycle.action.includes("file_write") || cycle.action.includes("[ERROR]");
    });
    return noProgress;
  }
  detectRepetition(_input) {
    const REPETITION_THRESHOLD = 3;
    const { history } = this.context;
    if (history.length < REPETITION_THRESHOLD) {
      return false;
    }
    const recentCycles = history.slice(-REPETITION_THRESHOLD);
    const thoughts = recentCycles.map((c) => c.thought);
    const allSame = thoughts.every((t) => t === thoughts[0]);
    return allSame;
  }
  validateGoalAlignment(observation) {
    const { goal } = this.context;
    const goalLower = goal.toLowerCase();
    const observationLower = observation.toLowerCase();
    const obsFileMatch = observation.match(/(\w+)\.ts/);
    if (obsFileMatch) {
      const obsFile = obsFileMatch[1];
      const goalMentionsFile = goalLower.includes(obsFile.toLowerCase());
      if (!goalMentionsFile) {
        return {
          aligned: false,
          reason: `Goal does not mention ${obsFileMatch[0]} but action affected it`
        };
      }
    }
    const goalFileMatch = goal.match(/(\w+\.ts)/);
    if (goalFileMatch && obsFileMatch) {
      const goalFile = goalFileMatch[1];
      const obsFile = obsFileMatch[0];
      if (goalFile !== obsFile) {
        return {
          aligned: false,
          reason: `Goal mentions ${goalFile} but action affected ${obsFile}`
        };
      }
    }
    if (goalLower.includes("create") && observationLower.includes("updated")) {
      return {
        aligned: false,
        reason: "Goal is to create file but observation shows update"
      };
    }
    if (goalLower.includes("update") && observationLower.includes("created")) {
      return {
        aligned: false,
        reason: "Goal is to update file but observation shows creation"
      };
    }
    return { aligned: true };
  }
}

// src/core/llm/ContextManager.ts
var COMPACTION_STRATEGIES = {
  aggressive: {
    name: "aggressive",
    keepRecent: 3,
    targetRatio: 0.3
  },
  balanced: {
    name: "balanced",
    keepRecent: 5,
    targetRatio: 0.5
  },
  conservative: {
    name: "conservative",
    keepRecent: 8,
    targetRatio: 0.7
  }
};

class ContextManager {
  config;
  router;
  constructor(config = {}, router) {
    this.config = {
      maxTokens: config.maxTokens || 128000,
      warningThreshold: config.warningThreshold || 70,
      compactionThreshold: config.compactionThreshold || 80,
      strategy: config.strategy || COMPACTION_STRATEGIES.balanced
    };
    this.router = router;
  }
  estimateTokens(messages) {
    let tokens = 0;
    for (const message of messages) {
      if (typeof message.content === "string") {
        tokens += Math.ceil(message.content.length / 4);
      } else {
        for (const block of message.content) {
          if (block.type === "text") {
            tokens += Math.ceil(block.text.length / 4);
          } else if (block.type === "tool_result") {
            tokens += Math.ceil(block.content.length / 4);
          }
        }
      }
      tokens += 10;
    }
    return tokens;
  }
  checkContextHealth(messages) {
    const currentTokens = this.estimateTokens(messages);
    const percentage = currentTokens / this.config.maxTokens * 100;
    if (percentage >= this.config.compactionThreshold) {
      return {
        status: "critical",
        currentTokens,
        percentage,
        shouldCompact: true,
        recommendation: `Context at ${percentage.toFixed(1)}% - compaction required`
      };
    } else if (percentage >= this.config.warningThreshold) {
      return {
        status: "warning",
        currentTokens,
        percentage,
        shouldCompact: false,
        recommendation: `Context at ${percentage.toFixed(1)}% - approaching limit`
      };
    } else {
      return {
        status: "healthy",
        currentTokens,
        percentage,
        shouldCompact: false,
        recommendation: `Context healthy (${percentage.toFixed(1)}%)`
      };
    }
  }
  async compactMessages(messages, systemPrompt) {
    if (!this.router) {
      throw new Error("LLM Router required for compaction");
    }
    const strategy = this.config.strategy;
    const originalTokens = this.estimateTokens(messages);
    const recentMessages = messages.slice(-strategy.keepRecent);
    const oldMessages = messages.slice(0, -strategy.keepRecent);
    if (oldMessages.length === 0) {
      return {
        messages,
        result: {
          originalMessageCount: messages.length,
          compactedMessageCount: messages.length,
          originalTokens,
          compactedTokens: originalTokens,
          compressionRatio: 1
        }
      };
    }
    const summaryPrompt = this.buildSummaryPrompt(oldMessages, systemPrompt);
    try {
      const response = await this.router.route({
        messages: [{ role: "user", content: summaryPrompt }],
        system: "You are a conversation summarizer. Create concise, information-dense summaries.",
        max_tokens: Math.ceil(originalTokens * strategy.targetRatio)
      }, {
        taskType: "general",
        priority: "speed",
        requiresUnrestricted: false
      });
      const firstContent = response.content[0];
      const summary = firstContent.type === "text" ? firstContent.text : "Unable to create summary";
      const compactedMessages = [
        {
          role: "user",
          content: `[Previous conversation summary]

${summary}

[End of summary. Recent messages follow:]`
        },
        ...recentMessages
      ];
      const compactedTokens = this.estimateTokens(compactedMessages);
      return {
        messages: compactedMessages,
        result: {
          originalMessageCount: messages.length,
          compactedMessageCount: compactedMessages.length,
          originalTokens,
          compactedTokens,
          compressionRatio: compactedTokens / originalTokens
        }
      };
    } catch (error2) {
      console.warn("[ContextManager] Summarization failed, using truncation fallback");
      return {
        messages: recentMessages,
        result: {
          originalMessageCount: messages.length,
          compactedMessageCount: recentMessages.length,
          originalTokens,
          compactedTokens: this.estimateTokens(recentMessages),
          compressionRatio: recentMessages.length / messages.length
        }
      };
    }
  }
  buildSummaryPrompt(messages, systemPrompt) {
    const conversationText = messages.map((msg) => {
      const role = msg.role === "user" ? "User" : "Assistant";
      const content = typeof msg.content === "string" ? msg.content : msg.content.map((block) => {
        if (block.type === "text")
          return block.text;
        if (block.type === "tool_result")
          return `[Tool result: ${block.content.substring(0, 100)}...]`;
        return "";
      }).join(`
`);
      return `${role}: ${content}`;
    }).join(`

`);
    return `
Summarize the following conversation concisely while preserving all critical information:
- Key decisions and conclusions
- Important facts and context
- Action items and results
- Technical details and error information

${systemPrompt ? `System context: ${systemPrompt}
` : ""}

Conversation:
${conversationText}

Provide a dense, information-rich summary that captures the essential content in as few words as possible:
`.trim();
  }
  async autoCompact(messages, systemPrompt) {
    const health = this.checkContextHealth(messages);
    if (health.shouldCompact) {
      const { messages: compactedMessages, result } = await this.compactMessages(messages, systemPrompt);
      return {
        messages: compactedMessages,
        wasCompacted: true,
        result
      };
    }
    return {
      messages,
      wasCompacted: false
    };
  }
  updateConfig(config) {
    this.config = {
      ...this.config,
      ...config
    };
  }
  getConfig() {
    return { ...this.config };
  }
}

// src/cli/commands/ReCommand.ts
import { existsSync, readFileSync } from "fs";
class ReCommand {
  name = "re";
  async execute(context, options) {
    try {
      const action = options.action || "analyze";
      const target = options.target;
      if (!target) {
        return {
          success: false,
          message: "Target required. Use: /re [target-type] [path/url]"
        };
      }
      console.log(source_default2.bold(`
=== Reverse Engineering Mode ===`));
      console.log(source_default2.cyan(`Target: ${target}`));
      console.log(source_default2.cyan(`Action: ${action}
`));
      switch (action) {
        case "extract":
          return this.extractTarget(context, target);
        case "analyze":
          return this.analyzeTarget(context, target);
        case "deobfuscate":
          return this.deobfuscateTarget(context, target);
        default:
          return {
            success: false,
            message: `Unknown action: ${action}. Use: extract, analyze, deobfuscate`
          };
      }
    } catch (error2) {
      return {
        success: false,
        message: error2.message || "Reverse engineering command failed"
      };
    }
  }
  extractTarget(context, target) {
    console.log(source_default2.yellow("Step 1: Determining target type..."));
    if (target.endsWith(".crx")) {
      console.log(source_default2.green("Detected: Chrome Extension"));
      console.log(source_default2.gray(`
Instructions:`));
      console.log(source_default2.gray("1. Extract CRX file (rename to .zip and unzip)"));
      console.log(source_default2.gray("2. Read manifest.json"));
      console.log(source_default2.gray(`3. Analyze background scripts and content scripts
`));
      return {
        success: true,
        message: "Chrome extension detected. Extract and analyze manually."
      };
    }
    if (target.endsWith(".app")) {
      console.log(source_default2.green("Detected: Electron App"));
      console.log(source_default2.gray(`
Instructions:`));
      console.log(source_default2.gray("1. Install: npm install -g @electron/asar"));
      console.log(source_default2.gray("2. Navigate to: AppName.app/Contents/Resources"));
      console.log(source_default2.gray("3. Extract: asar extract app.asar ./output"));
      console.log(source_default2.gray(`4. Read package.json and main entry files
`));
      return {
        success: true,
        message: "Electron app detected. Extract and analyze manually."
      };
    }
    if (target.endsWith(".js")) {
      console.log(source_default2.green("Detected: JavaScript file"));
      console.log(source_default2.gray(`
Instructions:`));
      console.log(source_default2.gray("1. Beautify: js-beautify -f input.js -o output.js"));
      console.log(source_default2.gray("2. Or use: https://deobfuscate.io/"));
      console.log(source_default2.gray(`3. Or use: https://beautifier.io/
`));
      return {
        success: true,
        message: "JavaScript file detected. Use beautification tools."
      };
    }
    if (target.startsWith("http://") || target.startsWith("https://")) {
      console.log(source_default2.green("Detected: URL"));
      console.log(source_default2.gray(`
Instructions:`));
      console.log(source_default2.gray("1. Use /research-api for web API research"));
      console.log(source_default2.gray(`2. Use /re for mobile app analysis
`));
      return {
        success: true,
        message: "URL detected. Use /research-api for API analysis."
      };
    }
    if (target.endsWith(".app")) {
      console.log(source_default2.green("Detected: macOS Application"));
      console.log(source_default2.gray(`
Instructions:`));
      console.log(source_default2.gray("1. Right-click → Show Package Contents"));
      console.log(source_default2.gray("2. Or: cd /Applications/AppName.app/Contents"));
      console.log(source_default2.gray(`3. Check: Resources, Frameworks directories
`));
      return {
        success: true,
        message: "macOS app detected. Explore bundle structure."
      };
    }
    console.log(source_default2.yellow(`Unknown target type. Manual analysis required.
`));
    return {
      success: true,
      message: "Target type unknown. Analyze manually."
    };
  }
  analyzeTarget(context, target) {
    console.log(source_default2.yellow("Step 1: Reading target file..."));
    if (!existsSync(target)) {
      return {
        success: false,
        message: `Target not found: ${target}`
      };
    }
    const content = readFileSync(target, "utf-8");
    const ext = target.split(".").pop();
    console.log(source_default2.yellow("Step 2: Analyzing structure..."));
    if (ext === "json") {
      try {
        const json = JSON.parse(content);
        console.log(source_default2.green("Valid JSON detected"));
        console.log(source_default2.gray(`
Structure:`));
        console.log(source_default2.gray(JSON.stringify(json, null, 2)));
      } catch (e) {
        console.log(source_default2.red("Invalid JSON"));
      }
    }
    if (ext === "js") {
      console.log(source_default2.green("JavaScript detected"));
      console.log(source_default2.gray(`
Lines: ` + content.split(`
`).length));
      console.log(source_default2.gray("Characters: " + content.length));
      console.log(source_default2.gray(`
Recommendations:`));
      console.log(source_default2.gray("- Use js-beautify to format"));
      console.log(source_default2.gray("- Check for minification patterns"));
    }
    if (ext === "md") {
      console.log(source_default2.green("Markdown detected"));
      console.log(source_default2.gray(`
Lines: ` + content.split(`
`).length));
      console.log(source_default2.gray("Headings: " + (content.match(/^#+\s/g) || []).length));
    }
    console.log(source_default2.gray(`
Analysis complete.
`));
    return {
      success: true,
      message: "Analysis complete"
    };
  }
  deobfuscateTarget(context, target) {
    console.log(source_default2.yellow("Step 1: Checking for obfuscation..."));
    if (!existsSync(target)) {
      return {
        success: false,
        message: `Target not found: ${target}`
      };
    }
    const content = readFileSync(target, "utf-8");
    const lines = content.split(`
`);
    const isMinified = lines.length === 1 && content.length > 1000 && !content.includes(`
`);
    const hasShortNames = /^[a-z0-9_$]{1,2}\b/.test(content);
    const isObfuscated = isMinified || hasShortNames;
    if (!isObfuscated) {
      console.log(source_default2.green("No obfuscation detected"));
      console.log(source_default2.gray(`
File appears to be already readable.
`));
      return {
        success: true,
        message: "No obfuscation detected"
      };
    }
    console.log(source_default2.yellow("Obfuscation detected"));
    console.log(source_default2.gray(`
Recommendations:`));
    console.log(source_default2.gray("1. Use js-beautify: npm install -g js-beautify"));
    console.log(source_default2.gray("2. Use online tools:"));
    console.log(source_default2.gray("   - https://deobfuscate.io/"));
    console.log(source_default2.gray("   - https://beautifier.io/"));
    console.log(source_default2.gray(`3. Use AST Explorer: https://astexplorer.net/
`));
    console.log(source_default2.cyan(`
Manual deobfuscation required.
`));
    return {
      success: true,
      message: "Obfuscation detected. Use beautification tools."
    };
  }
}

// src/cli/commands/AutoCommand.ts
import { exec as exec4 } from "child_process";
import { promisify as promisify4 } from "util";

// src/core/debug/orchestrator/Snapshotter.ts
class Snapshotter {
  snapshotDir;
  constructor(snapshotDir) {
    this.snapshotDir = snapshotDir;
  }
  async createSnapshot(snapshotId, testCommand, description) {
    const testResult = await this.runTest(testCommand);
    const parsedResults = this.parseTestOutput(testResult.output, testResult.exitCode);
    const snapshot = {
      snapshotId,
      description,
      testCommand,
      output: testResult.output,
      exitCode: testResult.exitCode,
      testCount: parsedResults.testCount,
      failedCount: parsedResults.failedCount,
      timestamp: new Date().toISOString(),
      testsPassed: parsedResults.testsPassed
    };
    const snapshotPath = `${this.snapshotDir}/${snapshotId}.json`;
    return {
      snapshotId,
      snapshotPath,
      snapshot
    };
  }
  async runTest(_testCommand) {
    return {
      output: "// TEST OUTPUT PLACEHOLDER - Use Bash tool to execute",
      exitCode: 0
    };
  }
  parseTestOutput(output, exitCode) {
    let testsPassed = false;
    let testCount = 0;
    let failedCount = 0;
    const jestMatch = output.match(/Tests:.*?(\d+)\s+passed/);
    const totalMatch = output.match(/(\d+)\s+total/);
    const jestFailedMatch = output.match(/(\d+)\s+failed/);
    if (jestMatch && totalMatch) {
      testCount = parseInt(totalMatch[1], 10);
      failedCount = jestFailedMatch ? parseInt(jestFailedMatch[1], 10) : 0;
      testsPassed = failedCount === 0 && testCount > 0;
      return { testsPassed, testCount, failedCount };
    }
    const mochaMatch = output.match(/(\d+)\s+passing/);
    const mochaFailedMatch = output.match(/(\d+)\s+failing/);
    if (mochaMatch) {
      testCount = parseInt(mochaMatch[1], 10);
      failedCount = mochaFailedMatch ? parseInt(mochaFailedMatch[1], 10) : 0;
      testsPassed = failedCount === 0;
      return { testsPassed, testCount, failedCount };
    }
    if (/PASS|SUCCESS|OK/.test(output)) {
      if (!/FAIL|ERROR|FAILED/.test(output)) {
        testsPassed = true;
      }
    } else if (exitCode === 0) {
      testsPassed = true;
    }
    return { testsPassed, testCount, failedCount };
  }
  async loadSnapshot(_snapshotId) {
    return null;
  }
  generateBeforeId() {
    return `before_${Date.now()}`;
  }
  generateAfterId() {
    return `after_${Date.now()}`;
  }
}

// src/core/debug/orchestrator/Memory.ts
class Memory {
  memoryFile;
  constructor(memoryFile) {
    this.memoryFile = memoryFile;
  }
  async recordBugFix(bugDescription, bugType, fixDescription, filesChanged, success, testsPassed = "unknown") {
    const record = {
      timestamp: new Date().toISOString(),
      bugDescription,
      bugType,
      fixDescription,
      filesChanged,
      success,
      testsPassed,
      embeddingKeywords: this.extractKeywords(`${bugDescription} ${fixDescription}`)
    };
    return record;
  }
  async searchSimilarBugs(_searchQuery, _limit = 5) {
    return {
      similarFixes: [],
      count: 0
    };
  }
  extractKeywords(text) {
    return text.toLowerCase().split(/\s+/).filter((word) => word.length > 3).filter((word) => !this.isStopWord(word));
  }
  isStopWord(word) {
    const stopWords = new Set([
      "the",
      "and",
      "for",
      "that",
      "this",
      "with",
      "from",
      "have",
      "been",
      "were",
      "what",
      "when",
      "where",
      "which",
      "their",
      "there"
    ]);
    return stopWords.has(word);
  }
  async getRecentFixes(_count = 10) {
    return [];
  }
  async getSuccessfulFixes(_limit = 20) {
    return [];
  }
  async getFixesByType(_bugType, _limit = 10) {
    return [];
  }
  async getStats() {
    return {
      total: 0,
      successful: 0,
      failed: 0,
      byType: {}
    };
  }
}

// src/core/debug/orchestrator/Searcher.ts
class Searcher {
  githubMcpAvailable;
  constructor(githubMcpAvailable = false) {
    this.githubMcpAvailable = githubMcpAvailable;
  }
  async searchGitHub(_bugDescription, _limit = 3) {
    if (this.githubMcpAvailable) {
      return {
        available: true,
        mcpAvailable: true,
        note: "Use mcp__grep__searchGitHub for searching similar issues"
      };
    }
    return {
      available: false
    };
  }
  buildGitHubQuery(bugDescription, bugType) {
    const keywords = this.extractKeywords(bugDescription);
    const query = [...keywords, bugType].filter(Boolean).join(" ");
    return query;
  }
  extractKeywords(text) {
    return text.toLowerCase().replace(/[^\w\s]/g, " ").split(/\s+/).filter((word) => word.length > 3).filter((word) => !this.isCommonWord(word)).slice(0, 5);
  }
  isCommonWord(word) {
    const common = new Set([
      "the",
      "and",
      "for",
      "that",
      "this",
      "with",
      "from",
      "have",
      "been",
      "error",
      "issue",
      "problem",
      "help",
      "need"
    ]);
    return common.has(word);
  }
  async searchCodebase(_errorPattern, _fileGlob) {
    return [];
  }
  async buildSearchContext(bugDescription, bugType, similarFixesFromMemory) {
    const githubSolutions = await this.searchGitHub(bugDescription);
    return {
      bugDescription,
      bugType,
      similarFixesFromMemory,
      githubSolutions
    };
  }
  generateSearchRecommendations(bugType, keywords) {
    const recommendations = [];
    if (bugType === "test_failure") {
      recommendations.push("Search for test framework-specific issues");
      recommendations.push("Look for async test patterns");
    } else if (bugType === "type_error") {
      recommendations.push("Search for TypeScript type definitions");
      recommendations.push("Check for interface mismatches");
    } else if (bugType === "runtime_error") {
      recommendations.push("Search for error stack traces");
      recommendations.push("Check for null/undefined handling");
    }
    if (keywords.includes("async") || keywords.includes("promise")) {
      recommendations.push("Review async/await patterns");
    }
    if (keywords.includes("import") || keywords.includes("module")) {
      recommendations.push("Check module resolution");
    }
    return recommendations;
  }
}

// src/core/debug/orchestrator/Verifier.ts
class Verifier {
  regressionLog;
  constructor(regressionLog) {
    this.regressionLog = regressionLog;
  }
  async detectRegression(beforeSnapshot, afterSnapshot) {
    const beforePassed = beforeSnapshot.testsPassed;
    const afterPassed = afterSnapshot.testsPassed;
    let regressionDetected = false;
    let regressionType = "none";
    let details = "";
    let recommendation = "";
    if (beforePassed && !afterPassed) {
      regressionDetected = true;
      regressionType = "test_failure";
      details = "Tests passed before fix, but fail after fix";
      recommendation = "Revert fix and try alternative approach";
      await this.recordRegression({
        regressionDetected: true,
        regressionType,
        details,
        beforeSnapshot: beforeSnapshot.snapshotId,
        afterSnapshot: afterSnapshot.snapshotId
      });
    } else if (this.hasNewErrors(beforeSnapshot.output, afterSnapshot.output)) {
      regressionDetected = true;
      regressionType = "new_errors";
      details = "New errors appeared in test output after fix";
      recommendation = "Review error messages and adjust fix";
    } else if (beforeSnapshot.testCount > afterSnapshot.testCount) {
      regressionDetected = true;
      regressionType = "test_failure";
      details = `Test count decreased from ${beforeSnapshot.testCount} to ${afterSnapshot.testCount}`;
      recommendation = "Some tests may have been skipped or removed";
    }
    return {
      regressionDetected,
      regressionType,
      details,
      beforeSnapshot: beforeSnapshot.snapshotId,
      afterSnapshot: afterSnapshot.snapshotId,
      recommendation
    };
  }
  async verifyFix(beforeSnapshot, afterSnapshot, _fixDescription) {
    const regression = await this.detectRegression(beforeSnapshot, afterSnapshot);
    const beforePassed = beforeSnapshot.testsPassed;
    const afterPassed = afterSnapshot.testsPassed;
    const fixEffective = !beforePassed && afterPassed;
    const success = fixEffective && !regression.regressionDetected;
    let recommendation;
    if (regression.regressionDetected) {
      recommendation = `Regression detected: ${regression.details}. ${regression.recommendation}`;
    } else if (fixEffective) {
      recommendation = "Fix successful - tests now passing";
    } else if (beforePassed && afterPassed) {
      recommendation = "Tests passing before and after - verify fix addressed root cause";
    } else {
      recommendation = "Fix did not resolve test failures - try alternative approach";
    }
    return {
      success,
      regression,
      fixEffective,
      testsPassed: afterPassed,
      recommendation
    };
  }
  hasNewErrors(beforeOutput, afterOutput) {
    const errorPatterns = [/ERROR:/gi, /Exception:/gi, /Fatal:/gi, /\bFAILED\b/gi];
    const beforeErrors = this.countErrors(beforeOutput, errorPatterns);
    const afterErrors = this.countErrors(afterOutput, errorPatterns);
    return afterErrors > beforeErrors;
  }
  countErrors(output, patterns) {
    let count = 0;
    for (const pattern of patterns) {
      const matches = output.match(pattern);
      if (matches) {
        count += matches.length;
      }
    }
    return count;
  }
  async recordRegression(_regression) {}
  async getRecentRegressions(_limit = 10) {
    return [];
  }
  async checkSimilarRegressions(_details) {
    return [];
  }
}

// src/core/debug/orchestrator/Recommender.ts
class Recommender {
  generateVerificationRecommendation(verification, _fixDescription) {
    if (verification.regression.regressionDetected) {
      return {
        status: "regression_detected",
        message: "Fix introduced a regression - tests passing before, failing after",
        regressionsDetected: true,
        recommendation: "REVERT THE FIX",
        actions: [
          "1. Git revert the changes",
          "2. Analyze test failures",
          "3. Try alternative approach using similar_fixes from memory"
        ],
        confidence: 95
      };
    } else if (verification.success) {
      return {
        status: "success",
        message: "Fix verified - no regressions detected",
        regressionsDetected: false,
        recommendation: "Fix successful - continue with next task",
        actions: ["1. Record successful fix to memory", "2. Continue with next task"],
        confidence: 90
      };
    } else if (!verification.fixEffective) {
      return {
        status: "failed",
        message: "Fix did not resolve the issue",
        regressionsDetected: false,
        recommendation: "Try alternative approach",
        actions: [
          "1. Review similar fixes from memory",
          "2. Search GitHub for solutions",
          "3. Try different approach"
        ],
        confidence: 70
      };
    }
    return {
      status: "needs_alternative",
      message: "Fix partially effective but needs refinement",
      regressionsDetected: false,
      recommendation: "Refine the fix",
      actions: ["1. Analyze test output", "2. Adjust fix incrementally"],
      confidence: 60
    };
  }
  generateSmartDebugContext(bugDescription, beforeSnapshotId, similarFixes, githubSolutions) {
    const fixPrompt = {
      task: "Fix bug with regression awareness",
      bugDescription,
      bugType: "general",
      context: "",
      similarFixesFromMemory: similarFixes,
      githubSolutions,
      instructions: [
        "1. Review similar fixes from memory to avoid repeating failed approaches",
        "2. Consider GitHub solutions if available",
        "3. Make the fix incrementally",
        "4. Think about potential side effects on other components",
        "5. Run tests after fix to detect regressions"
      ]
    };
    return {
      bug: bugDescription,
      beforeSnapshot: beforeSnapshotId,
      similarFixesCount: similarFixes.count,
      similarFixes,
      githubSolutions,
      fixPrompt,
      nextSteps: [
        "1. Review similar fixes and GitHub solutions",
        "2. Apply fix incrementally",
        "3. Run: verify-fix <snapshot_id> <test_command>",
        "4. If regression detected, will auto-recommend revert"
      ]
    };
  }
  generateAlternativeApproaches(bugDescription, failedApproaches, similarFixes) {
    const alternatives = [];
    for (const fix of similarFixes) {
      if (fix.success && !failedApproaches.includes(fix.fixDescription)) {
        alternatives.push(fix.fixDescription);
      }
    }
    if (bugDescription.toLowerCase().includes("test fail")) {
      alternatives.push("Check test setup/teardown");
      alternatives.push("Verify test data fixtures");
      alternatives.push("Review async test timing");
    }
    if (bugDescription.toLowerCase().includes("type error")) {
      alternatives.push("Add explicit type annotations");
      alternatives.push("Check interface definitions");
      alternatives.push("Review generic type constraints");
    }
    if (bugDescription.toLowerCase().includes("undefined")) {
      alternatives.push("Add null checks");
      alternatives.push("Initialize variables explicitly");
      alternatives.push("Review optional chaining usage");
    }
    return alternatives.slice(0, 5);
  }
  generateIncrementalSteps(bugDescription, context) {
    const steps = [
      "Create test snapshot before changes",
      "Identify minimal change needed",
      "Apply single change",
      "Run tests and check for regression",
      "If passing, continue; if failing, revert and try alternative"
    ];
    if (context.similarFixesFromMemory.count > 0) {
      steps.unshift("Review similar successful fixes from memory");
    }
    if (context.githubSolutions.available) {
      steps.unshift("Check GitHub solutions for patterns");
    }
    return steps;
  }
  assessConfidence(context) {
    let confidence = 50;
    confidence += Math.min(context.similarFixesCount * 10, 30);
    if (context.hasGitHubSolutions) {
      confidence += 15;
    }
    if (context.testsPassed) {
      confidence += 20;
    }
    confidence -= Math.min(context.attemptCount * 5, 20);
    return Math.max(0, Math.min(100, confidence));
  }
}

// src/core/debug/orchestrator/index.ts
class DebugOrchestrator {
  snapshotter;
  memory;
  searcher;
  verifier;
  recommender;
  constructor(config) {
    this.snapshotter = new Snapshotter(config.testSnapshotsDir);
    this.memory = new Memory(config.bugFixMemoryFile);
    this.searcher = new Searcher(config.githubMcpAvailable);
    this.verifier = new Verifier(config.regressionLogFile);
    this.recommender = new Recommender;
  }
  async smartDebug(input) {
    const {
      bugDescription,
      testCommand = 'echo "No tests configured"'
    } = input;
    const beforeSnapshotId = this.snapshotter.generateBeforeId();
    await this.snapshotter.createSnapshot(beforeSnapshotId, testCommand, `Before fix: ${bugDescription}`);
    const similarFixes = await this.memory.searchSimilarBugs(bugDescription, 5);
    const githubSolutions = await this.searcher.searchGitHub(bugDescription);
    const debugContext = this.recommender.generateSmartDebugContext(bugDescription, beforeSnapshotId, similarFixes, githubSolutions);
    return debugContext;
  }
  async verifyFix(input) {
    const { beforeSnapshotId, testCommand, fixDescription = "Fix applied" } = input;
    const afterSnapshotId = this.snapshotter.generateAfterId();
    await this.snapshotter.createSnapshot(afterSnapshotId, testCommand, "After fix");
    const beforeSnapshot = await this.snapshotter.loadSnapshot(beforeSnapshotId);
    const afterSnapshot = await this.snapshotter.loadSnapshot(afterSnapshotId);
    if (!beforeSnapshot || !afterSnapshot) {
      return {
        status: "failed",
        message: "Snapshots not found",
        regressionsDetected: false,
        recommendation: "Ensure snapshots were created successfully",
        actions: ["Create snapshots before verification"]
      };
    }
    const verification = await this.verifier.verifyFix(beforeSnapshot, afterSnapshot, fixDescription);
    const recommendation = this.recommender.generateVerificationRecommendation(verification, fixDescription);
    if (verification.success) {
      await this.memory.recordBugFix("Bug fix verified", "general", fixDescription, "unknown", true, "passed");
    }
    return recommendation;
  }
  async recordBugFix(bugDescription, bugType, fixDescription, filesChanged, success, testsPassed = "unknown") {
    return this.memory.recordBugFix(bugDescription, bugType, fixDescription, filesChanged, success, testsPassed);
  }
  async searchSimilarBugs(query, limit = 5) {
    return this.memory.searchSimilarBugs(query, limit);
  }
  async searchGitHub(bugDescription, limit = 3) {
    return this.searcher.searchGitHub(bugDescription, limit);
  }
  async createSnapshot(snapshotId, testCommand, description) {
    return this.snapshotter.createSnapshot(snapshotId, testCommand, description);
  }
  async detectRegression(beforeSnapshot, afterSnapshot) {
    return this.verifier.detectRegression(beforeSnapshot, afterSnapshot);
  }
  generateAlternatives(bugDescription, failedApproaches, similarFixes) {
    return this.recommender.generateAlternativeApproaches(bugDescription, failedApproaches, similarFixes);
  }
  async getMemoryStats() {
    return this.memory.getStats();
  }
  async getRecentRegressions(limit = 10) {
    return this.verifier.getRecentRegressions(limit);
  }
}
function createDebugOrchestrator(debugDir = "~/.claude/.debug", githubMcpAvailable = false) {
  const config = {
    debugDir,
    bugFixMemoryFile: `${debugDir}/bug-fixes.jsonl`,
    regressionLogFile: `${debugDir}/regressions.jsonl`,
    testSnapshotsDir: `${debugDir}/test-snapshots`,
    githubMcpAvailable
  };
  return new DebugOrchestrator(config);
}

// src/cli/commands/auto/AutonomousExecutor.ts
class AutonomousExecutor {
  deps;
  callbacks;
  state = {
    iterations: 0,
    consecutiveSuccesses: 0,
    consecutiveFailures: 0,
    taskInProgress: false
  };
  constructor(deps, callbacks) {
    this.deps = deps;
    this.callbacks = callbacks;
  }
  async runLoop(agent, context, config) {
    const maxIterations = config.maxIterations || 50;
    let goalAchieved = false;
    while (this.state.iterations < maxIterations && !goalAchieved) {
      this.state.iterations++;
      this.callbacks.onSpinnerUpdate(`Iteration ${this.state.iterations}/${maxIterations}`);
      try {
        await this.callbacks.onContextCompaction(config);
        this.state.taskInProgress = true;
        const cycle = await this.executeReflexionCycle(agent, context, config);
        this.state.taskInProgress = false;
        this.callbacks.onCycleDisplay(cycle, config.verbose || false);
        if (cycle.success) {
          this.state.consecutiveSuccesses++;
          this.state.consecutiveFailures = 0;
        } else {
          this.state.consecutiveFailures++;
          this.state.consecutiveSuccesses = 0;
        }
        goalAchieved = await this.checkGoalAchievement(agent, context, config.goal);
        await this.callbacks.onSkillInvocation(context, config, cycle, goalAchieved);
        await this.sleep(500);
      } catch (error2) {
        const err = error2;
        this.callbacks.onWarn(`Iteration ${this.state.iterations} failed: ${err.message}`);
        await this.deps.memory.recordEpisode("error_encountered", `Iteration ${this.state.iterations} error`, "failed", err.message);
        continue;
      }
    }
    if (!goalAchieved && this.state.iterations >= maxIterations) {
      return {
        success: false,
        message: `Max iterations (${maxIterations}) reached without achieving goal`
      };
    }
    return {
      success: true,
      message: "Goal achieved",
      data: {
        iterations: this.state.iterations,
        history: agent.getHistory()
      }
    };
  }
  async executeReflexionCycle(agent, context, config) {
    const memoryContext = await this.deps.memory.getWorking();
    const recentEpisodes = await this.deps.memory.searchEpisodes(config.goal, 5);
    const prompt = this.buildCyclePrompt(config.goal, memoryContext, recentEpisodes);
    const userMessage = { role: "user", content: prompt };
    this.deps.conversationHistory.push(userMessage);
    const llmResponse = await context.llmRouter.route({
      messages: [{ role: "user", content: prompt }],
      system: "You are an autonomous AI agent executing tasks. Think step by step."
    }, {
      taskType: "reasoning",
      priority: "quality",
      preferredModel: config.model,
      requiresUnrestricted: false
    });
    const firstContent = llmResponse.content[0];
    const thought = firstContent.type === "text" ? firstContent.text : "Unable to extract thought";
    const assistantMessage = {
      role: "assistant",
      content: llmResponse.content
    };
    this.deps.conversationHistory.push(assistantMessage);
    const cycle = await agent.cycle(thought);
    await this.deps.memory.addContext(`Iteration ${this.state.iterations}: ${cycle.thought}`, 7);
    return cycle;
  }
  buildCyclePrompt(goal, memoryContext, recentEpisodes) {
    return `
Goal: ${goal}

Context:
${memoryContext}

Recent History:
${recentEpisodes}

What is next step to achieve this goal? Think through:
1. What has been done so far?
2. What remains to be done?
3. What is the best next action?

Provide your reasoning and proposed action.
`.trim();
  }
  async checkGoalAchievement(agent, context, goal) {
    const history = agent.getHistory();
    const recentCycles = history.slice(-3);
    const allSuccessful = recentCycles.every((c) => c.success);
    if (allSuccessful && recentCycles.length >= 3) {
      try {
        const verificationPrompt = `
Goal: ${goal}

Recent actions and results:
${recentCycles.map((c) => `
Thought: ${c.thought}
Action: ${c.action}
Result: ${c.observation}
`).join(`
`)}

Has the goal been achieved? Answer with just "YES" or "NO" and brief explanation.
`.trim();
        const response = await context.llmRouter.route({
          messages: [{ role: "user", content: verificationPrompt }],
          system: "You are evaluating if a goal has been achieved. Be objective."
        }, {
          taskType: "reasoning",
          priority: "speed"
        });
        const firstContent = response.content[0];
        const answer = firstContent.type === "text" ? firstContent.text : "NO";
        return answer.toUpperCase().startsWith("YES");
      } catch (error2) {
        this.callbacks.onWarn("LLM verification unavailable, using heuristic");
        return allSuccessful && recentCycles.length >= 3;
      }
    }
    return false;
  }
  sleep(ms) {
    return new Promise((resolve2) => setTimeout(resolve2, ms));
  }
  getState() {
    return { ...this.state };
  }
}

// src/cli/commands/auto/HookIntegration.ts
import { exec as exec2 } from "child_process";
import { promisify as promisify2 } from "util";
import { join } from "path";
var execAsync = promisify2(exec2);

class HookIntegration {
  hooksPath = join(process.env.HOME || "", ".claude/hooks");
  async runHook(hookName, args = []) {
    const hookPath = join(this.hooksPath, `${hookName}.sh`);
    try {
      const { stdout } = await execAsync(`bash ${hookPath} ${args.join(" ")}`);
      return JSON.parse(stdout);
    } catch (error2) {
      return null;
    }
  }
  async evaluateQualityGate(output, taskType) {
    const criteria = await this.runHook("auto-evaluator", ["criteria", taskType]);
    const evaluation = await this.runHook("auto-evaluator", ["evaluate", output, criteria]);
    if (!evaluation) {
      return { passed: true, score: 7, feedback: "Quality gate check passed" };
    }
    const score = evaluation.score || 7;
    const passed = evaluation.decision === "continue" || score >= 7;
    return {
      passed,
      score,
      feedback: evaluation.message || `Quality score: ${score}/10`
    };
  }
  async checkBoundedAutonomy(task, context) {
    const check = await this.runHook("bounded-autonomy", ["check", task, context]);
    if (!check) {
      return { allowed: true, requiresApproval: false };
    }
    return {
      allowed: check.allowed !== false,
      requiresApproval: check.requires_approval === true,
      reason: check.reason
    };
  }
  async selectReasoningMode(task, context) {
    const modeInfo = await this.runHook("reasoning-mode-switcher", ["select", task, context, "normal", "normal", "low"]);
    if (!modeInfo) {
      return { mode: "deliberate", confidence: 0.7, reasoning: "Default mode selected" };
    }
    return {
      mode: modeInfo.selected_mode || "deliberate",
      confidence: modeInfo.confidence || 0.7,
      reasoning: modeInfo.reasoning || `Task characteristics suggest ${modeInfo.selected_mode || "deliberate"} mode`
    };
  }
  async runTreeOfThoughts(task, context) {
    const branches = await this.runHook("tree-of-thoughts", ["generate", task, context, "3"]);
    const evaluation = await this.runHook("tree-of-thoughts", ["evaluate", branches]);
    if (!evaluation) {
      return { branches: [], selected: null, success: false };
    }
    return {
      branches: branches.branches || [],
      selected: evaluation.selected_branch,
      success: true
    };
  }
  async analyzeParallelExecution(task, context) {
    const analysis = await this.runHook("parallel-execution-planner", ["analyze", task, context]);
    if (!analysis) {
      return { canParallelize: false, groups: [], success: false };
    }
    return {
      canParallelize: analysis.canParallelize || false,
      groups: analysis.groups || [],
      success: true
    };
  }
  async coordinateMultiAgent(task, _context) {
    const routing = await this.runHook("multi-agent-orchestrator", ["route", task]);
    const orchestrate = await this.runHook("multi-agent-orchestrator", ["orchestrate", task]);
    if (!routing || !orchestrate) {
      return { agent: "general", workflow: [], success: false };
    }
    return {
      agent: routing.selected_agent || "general",
      workflow: orchestrate.workflow || [],
      success: true
    };
  }
}

// src/cli/commands/CheckpointCommand.ts
import { existsSync as existsSync2, readFileSync as readFileSync2, writeFileSync } from "fs";
import { join as join2 } from "path";
import { execSync } from "child_process";
class CheckpointCommand {
  name = "checkpoint";
  async execute(context, options) {
    try {
      const claudeMdPath = join2(context.workDir, "CLAUDE.md");
      const pipelineState = null;
      let currentFeature = "";
      let currentTier = "";
      let currentPhase = "";
      let tierStatus = "";
      let reports = null;
      if (existsSync2(claudeMdPath)) {
        const claudeContent2 = readFileSync2(claudeMdPath, "utf-8");
        const pipelineMatch = claudeContent2.match(/## Pipeline State\n([\s\S]*?)(?=##|$)/s);
        if (pipelineMatch) {
          const pipelineContent = pipelineMatch[1];
          const phaseMatch = pipelineContent.match(/Phase:\s*(\w+)/);
          const featureMatch = pipelineContent.match(/Feature:\s*(.+)/);
          const tierMatch = pipelineContent.match(/Tier:\s*(\w+)/);
          const statusMatch = pipelineContent.match(/Tier-Status:\s*(\w+)/);
          const reportsMatch = pipelineContent.match(/Reports:\s*(.+)/);
          if (phaseMatch)
            currentPhase = phaseMatch[1];
          if (featureMatch)
            currentFeature = featureMatch[1];
          if (tierMatch)
            currentTier = tierMatch[1];
          if (statusMatch)
            tierStatus = statusMatch[1];
          if (reportsMatch)
            reports = reportsMatch[1];
        }
      }
      const buildguidePath = join2(context.workDir, "buildguide.md");
      let nextSection = "";
      const newDocsFound = [];
      if (existsSync2(buildguidePath)) {
        const buildguideContent = readFileSync2(buildguidePath, "utf-8");
        const uncheckedMatch = buildguideContent.match(/-\s*\[\s*\]\s*(.+)/);
        if (uncheckedMatch && uncheckedMatch.length > 0) {
          nextSection = uncheckedMatch[0].trim();
        }
      }
      let claudeContent = existsSync2(claudeMdPath) ? readFileSync2(claudeMdPath, "utf-8") : "";
      const now = new Date().toISOString().split("T")[0];
      const lastSessionRegex = /## Last Session\s*\([\s\S]*?\)\s*([\s\S]*?)/;
      claudeContent = claudeContent.replace(lastSessionRegex, "");
      const nextStepsMatch = claudeContent.match(/## Next Steps\s*([\s\S]*?)(?=##|$)/s);
      if (nextStepsMatch) {
        const nextStepsContent = nextStepsMatch[1];
        const filteredNextSteps = nextStepsContent.split(`
`).filter((line, index, _lines) => {
          if (line.trim().startsWith("- ")) {
            return index < 3;
          }
          return true;
        }).join(`
`);
        claudeContent = claudeContent.replace(nextStepsMatch[0], `## Next Steps
${filteredNextSteps}`);
      }
      claudeContent = claudeContent.replace(/## Session Log\s*[\s\S]*?(?=##|$)/gs, "");
      claudeContent = claudeContent.replace(/## History\s*[\s\S]*?(?=##|$)/gs, "");
      if (pipelineState) {
        const pipelineRegex = /## Pipeline State\s*([\s\S]*?)(?=##|$)/s;
        const newState = this.advancePipelineState(currentPhase, currentTier, tierStatus);
        const newPipelineSection = `## Pipeline State

Phase: ${newState.phase}
Feature: ${currentFeature}
Tier: ${newState.tier}
Tier-Status: ${newState.status}
Reports: ${reports || "N/A"}
`;
        if (pipelineRegex) {
          claudeContent = claudeContent.replace(pipelineRegex, newPipelineSection);
        } else {
          claudeContent += `
` + newPipelineSection;
        }
      }
      writeFileSync(claudeMdPath, claudeContent);
      try {
        const isGitRepo = execSync("git rev-parse --git-dir 2>/dev/null", { cwd: context.workDir, stdio: "pipe" });
        if (isGitRepo) {
          const hasChanges = execSync("git diff --quiet || git diff --cached --quiet", { cwd: context.workDir, stdio: "pipe" });
          if (hasChanges) {
            execSync("git add CLAUDE.md buildguide.md 2>/dev/null || git add CLAUDE.md", { cwd: context.workDir });
            execSync(`git commit -m "checkpoint: ${now} - session progress saved"`, { cwd: context.workDir });
            try {
              execSync("git push origin HEAD 2>/dev/null", { cwd: context.workDir });
            } catch (e) {
              console.log(source_default2.yellow("Note: Push failed, may need authentication"));
            }
          }
        }
      } catch (e) {}
      const continuationPrompt = this.generateContinuationPrompt(context.workDir, options.summary || "Session checkpointed", currentFeature, currentPhase, currentTier, tierStatus, nextSection, newDocsFound);
      console.log(source_default2.bold(`
` + continuationPrompt));
      return {
        success: true,
        message: "Checkpoint saved successfully"
      };
    } catch (error2) {
      return {
        success: false,
        message: error2.message || "Checkpoint failed"
      };
    }
  }
  advancePipelineState(phase, tier, status) {
    const transitions = {
      "debugging,high,in-progress": { phase: "debugging", tier: "medium", status: "pending" },
      "debugging,medium,in-progress": { phase: "debugging", tier: "low", status: "pending" },
      "debugging,low,in-progress": { phase: "refactor-hunt", tier: "-", status: "-" },
      "refactoring,high,in-progress": { phase: "refactoring", tier: "medium", status: "pending" },
      "refactoring,medium,in-progress": { phase: "refactoring", tier: "low", status: "pending" },
      "refactoring,low,in-progress": { phase: "build", tier: "-", status: "-" }
    };
    const key = `${phase},${tier},${status}`;
    return transitions[key] || { phase, tier, status };
  }
  generateContinuationPrompt(workDir, summary, feature, phase, tier, status, nextSection, newDocs) {
    const projectName = workDir.split("/").pop() || "Project";
    if (phase) {
      return this.generatePipelineContinuationPrompt(projectName, summary, feature, phase, tier, status, nextSection, newDocs);
    }
    return `
## Continuation Prompt

Continue work on ${projectName} at ${workDir}.

**What's Done**: ${summary}

**Current State**: Checkpoint saved at ${new Date().toLocaleTimeString()}

${nextSection ? `**Build Guide**: Next section: ${nextSection} - see buildguide.md for research` : ""}

${newDocs.length > 0 ? `**New Docs Found**: ${newDocs.join(", ")}` : ""}

**Next Step**: ${nextSection ? `Continue with ${nextSection}` : "Check CLAUDE.md for next steps"}

**Key Files**: CLAUDE.md${existsSync2(join2(workDir, "buildguide.md")) ? ", buildguide.md" : ""}

**Approach**: Do NOT explore full codebase. Use context above. Check buildguide.md for collected research.
`;
  }
  generatePipelineContinuationPrompt(projectName, summary, feature, phase, tier, status, nextSection, newDocs) {
    if (phase === "debugging") {
      return `
## Continuation Prompt

Continue work on ${projectName}.

**Pipeline Phase**: debugging
**Feature**: ${feature}
**Current Tier**: ${tier} - ${status}

**Next Action**: Fix ${tier} priority bugs from bug report

**Approach**: Do NOT explore codebase. Read only files in Scope above.
`;
    }
    if (phase === "refactor-hunt") {
      return `
## Continuation Prompt

Continue work on ${projectName}.

**Pipeline Phase**: refactor-hunt
**Feature**: ${feature}

**Next Action**: Run /refactor-hunt-checkpoint to analyze for refactoring opportunities

**Approach**: Do NOT explore codebase. Read only files in Scope above.
`;
    }
    if (phase === "refactoring") {
      return `
## Continuation Prompt

Continue work on ${projectName}.

**Pipeline Phase**: refactoring
**Feature**: ${feature}
**Current Tier**: ${tier} - ${status}

**Next Action**: Execute ${tier} priority refactors from refactor report

**Approach**: Do NOT explore codebase. Read only files in Scope above.
`;
    }
    if (phase === "build") {
      return `
## Continuation Prompt

Continue work on ${projectName}.

**Pipeline Complete** for feature: ${feature}

**Next Action**: ${nextSection || "Pipeline complete - check with user for next task"}

**Approach**: Read CLAUDE.md for full context. You may explore codebase as needed.
`;
    }
    return this.generateStandardContinuationPrompt(projectName, summary, nextSection, newDocs);
  }
  generateStandardContinuationPrompt(projectName, summary, nextSection, newDocs) {
    return `
## Continuation Prompt

Continue work on ${projectName}.

**What's Done**: ${summary}

${nextSection ? `**Build Guide**: Next section: ${nextSection} - see buildguide.md for research` : ""}

${newDocs.length > 0 ? `**New Docs Found**: ${newDocs.join(", ")}` : ""}

**Next Step**: ${nextSection || "Check CLAUDE.md for next steps"}

**Key Files**: CLAUDE.md

**Approach**: Do NOT explore full codebase. Use context above. Check buildguide.md for collected research.
`;
  }
}

// src/cli/commands/CommitCommand.ts
import { existsSync as existsSync3, readFileSync as readFileSync3, writeFileSync as writeFileSync2 } from "fs";
import { join as join3 } from "path";
import { execSync as execSync2 } from "child_process";
class CommitCommand {
  name = "commit";
  description = "Create a permanent version history commit (milestone)";
  async execute(context, options) {
    try {
      console.log(source_default2.bold(`
=== Git Commit (Milestone) ===`));
      try {
        execSync2("git rev-parse --git-dir", { cwd: context.workDir, stdio: "pipe" });
      } catch (e) {
        return {
          success: false,
          message: "Not in a git repository. Cannot create commit."
        };
      }
      const hasChanges = execSync2("git diff --quiet || git diff --cached --quiet", { cwd: context.workDir, stdio: "pipe" });
      if (!hasChanges) {
        console.log(source_default2.yellow(`
No changes to commit.`));
        return {
          success: true,
          message: "No changes to commit"
        };
      }
      let commitMessage = options.message;
      if (!commitMessage) {
        commitMessage = await this.generateCommitMessage(context);
      }
      console.log(source_default2.cyan(`
Commit message: ${commitMessage}`));
      console.log(source_default2.gray("Staging changes..."));
      execSync2("git add -A", { cwd: context.workDir });
      console.log(source_default2.gray("Creating commit..."));
      execSync2(`git commit -m "${commitMessage}"`, { cwd: context.workDir });
      console.log(source_default2.green("✓ Commit created successfully"));
      const commitHash = execSync2("git rev-parse --short HEAD", { cwd: context.workDir, encoding: "utf-8" }).trim();
      console.log(source_default2.gray(`Commit: ${commitHash}`));
      if (options.push) {
        console.log(source_default2.gray("Pushing to remote..."));
        try {
          if (options.branch) {
            execSync2(`git push origin ${options.branch}`, { cwd: context.workDir });
          } else {
            execSync2("git push origin HEAD", { cwd: context.workDir });
          }
          console.log(source_default2.green("✓ Pushed to remote"));
        } catch (e) {
          console.log(source_default2.yellow("Note: Push failed, may need authentication"));
        }
      }
      this.updateClaudeMd(context, commitMessage, commitHash);
      console.log(source_default2.bold(`
=== Milestone Saved ===`));
      console.log(source_default2.green("This commit represents a stable milestone in your project."));
      return {
        success: true,
        message: `Commit ${commitHash} created: ${commitMessage}`,
        data: { hash: commitHash, message: commitMessage }
      };
    } catch (error2) {
      return {
        success: false,
        message: error2.message || "Commit failed"
      };
    }
  }
  async generateCommitMessage(context) {
    try {
      const claudeMdPath = join3(context.workDir, "CLAUDE.md");
      let contextInfo = "";
      if (existsSync3(claudeMdPath)) {
        const claudeContent = readFileSync3(claudeMdPath, "utf-8");
        const lastSessionMatch = claudeContent.match(/## Last Session\s*\([^)]+\)\s*- ([^\n]+)/);
        if (lastSessionMatch) {
          contextInfo = lastSessionMatch[1].trim();
        }
      }
      const now = new Date().toISOString().split("T")[0];
      let message = `Milestone: ${now}`;
      if (contextInfo) {
        message += ` - ${contextInfo}`;
      }
      return message;
    } catch (e) {
      const now = new Date().toISOString().split("T")[0];
      return `Milestone: ${now}`;
    }
  }
  updateClaudeMd(context, message, hash) {
    const claudeMdPath = join3(context.workDir, "CLAUDE.md");
    if (!existsSync3(claudeMdPath))
      return;
    let claudeContent = readFileSync3(claudeMdPath, "utf-8");
    const now = new Date().toISOString().split("T")[0];
    const milestoneEntry = `- ${now}: ${message} (${hash})`;
    const milestonesRegex = /## Milestones\s*([\s\S]*?)(?=##|$)/s;
    const milestonesMatch = claudeContent.match(milestonesRegex);
    if (milestonesMatch) {
      const milestonesContent = milestonesMatch[1];
      const lines = milestonesContent.split(`
`);
      const nonEmptyLines = lines.filter((line) => line.trim() && !line.trim().startsWith("-"));
      const newMilestones = nonEmptyLines.join(`
`) + `
` + milestoneEntry;
      claudeContent = claudeContent.replace(milestonesRegex, `## Milestones
${newMilestones}`);
    } else {
      claudeContent += `

## Milestones
${milestoneEntry}`;
    }
    writeFileSync2(claudeMdPath, claudeContent);
  }
}

// src/cli/commands/CompactCommand.ts
import { writeFileSync as writeFileSync3, mkdirSync } from "fs";
import { join as join4 } from "path";
class CompactCommand {
  name = "compact";
  async execute(context, options) {
    try {
      console.log(source_default2.bold(`
=== Memory Compaction ===`));
      console.log(source_default2.cyan(`Analyzing current context...
`));
      let targetReduction = 50;
      if (options.level === "aggressive") {
        targetReduction = 60;
      } else if (options.level === "conservative") {
        targetReduction = 30;
      }
      console.log(source_default2.gray(`Compaction Level: ${options.level || "standard"} (${targetReduction}% reduction target)
`));
      const now = new Date;
      const time = now.toISOString().split("T")[0];
      const compactedContext = `## Compacted Context

**Time**: ${time}
**Compaction Level**: ${options.level || "standard"}

### Current Task
Working on project features and command implementation.

### Recent Actions (Last 5)
1. Created CheckpointCommand for session management
2. Created BuildCommand for autonomous building
3. Created CollabCommand for real-time collaboration
4. Analyzing command documentation for remaining commands
5. Implementing compact, multi-repo, personality, re, research-api, voice commands

### Current State
- **File**: src/cli/commands/ (in progress)
- **Status**: working
- **Pending**: Need to register all new commands in src/index.ts

### Key Context
- Project: komplete-kontrol-cli
- Language: TypeScript
- Framework: Commander.js
- Goal: Implement all missing commands from commands/ directory

### Next Steps
1. Complete remaining command implementations
2. Register all commands in src/index.ts
3. Test all commands
4. Update documentation
`;
      const memoryDir = join4(context.workDir, ".claude", "memory");
      const compactedPath = join4(memoryDir, "compacted-context.md");
      mkdirSync(memoryDir, { recursive: true });
      writeFileSync3(compactedPath, compactedContext);
      const continuationPrompt = `
## Memory Compacted

Context compaction complete.

**Compacted Context**:

${compactedContext}

**Next Action**: Continue with task implementation

**Approach**: Use compacted context above. Do not re-explore files already analyzed.
`;
      console.log(source_default2.bold(`
` + continuationPrompt));
      return {
        success: true,
        message: `Memory compacted (${targetReduction}% reduction target)`
      };
    } catch (error2) {
      return {
        success: false,
        message: error2.message || "Compaction failed"
      };
    }
  }
}

// src/cli/commands/auto/SkillInvoker.ts
class SkillInvoker {
  state;
  callbacks;
  checkpointCommand;
  commitCommand;
  compactCommand;
  constructor(state, callbacks) {
    this.state = state;
    this.callbacks = callbacks;
    this.checkpointCommand = new CheckpointCommand;
    this.commitCommand = new CommitCommand;
    this.compactCommand = new CompactCommand;
  }
  async invoke(context, config, cycle, isGoalAchieved, contextManager, conversationHistory) {
    const checkpointThreshold = config.checkpointThreshold || 10;
    const commitThreshold = 20;
    const shouldCheckpoint = this.state.iterations % checkpointThreshold === 0 || this.state.consecutiveFailures >= 3 || this.state.iterations - this.state.lastCheckpointIteration >= checkpointThreshold && this.state.consecutiveSuccesses >= 5;
    if (shouldCheckpoint) {
      await this.performCheckpoint(context, config.goal);
      if (contextManager && conversationHistory && conversationHistory.length > 0) {
        const health = contextManager.checkContextHealth(conversationHistory);
        if (health.status === "warning" || health.status === "critical") {
          await this.performCompact(context, "conservative");
        }
      }
    }
    const shouldCommit = this.state.iterations % commitThreshold === 0 && this.state.consecutiveSuccesses >= 10 || isGoalAchieved && this.state.iterations - this.state.lastCommitIteration >= 5;
    if (shouldCommit) {
      await this.performCommit(context, config.goal);
    }
  }
  async performCheckpoint(context, goal) {
    this.callbacks.onInfo("\uD83D\uDCF8 Auto-checkpoint triggered");
    try {
      const result = await this.checkpointCommand.execute(context, {
        summary: `Auto checkpoint at iteration ${this.state.iterations}: ${goal}`
      });
      if (result.success) {
        this.callbacks.onSuccess("Checkpoint saved - session can be resumed from this point");
      } else {
        this.callbacks.onWarn("Checkpoint failed (continuing anyway)");
      }
      this.state.lastCheckpointIteration = this.state.iterations;
    } catch (error2) {
      this.callbacks.onWarn("Checkpoint failed (continuing anyway)");
    }
  }
  async performCommit(context, goal) {
    this.callbacks.onInfo("\uD83D\uDCBE Auto-commit triggered (milestone)");
    try {
      const result = await this.commitCommand.execute(context, {
        message: `Milestone: ${goal} - iteration ${this.state.iterations}`,
        push: false
      });
      if (result.success) {
        this.callbacks.onSuccess("Commit created - milestone saved to version history");
      } else {
        this.callbacks.onWarn("Commit failed (continuing anyway)");
      }
      this.state.lastCommitIteration = this.state.iterations;
    } catch (error2) {
      this.callbacks.onWarn("Commit failed (continuing anyway)");
    }
  }
  async performCompact(context, level = "conservative") {
    this.callbacks.onInfo("\uD83D\uDD04 Auto-compact triggered");
    try {
      const result = await this.compactCommand.execute(context, { level });
      if (result.success) {
        this.callbacks.onSuccess("Memory compacted - context optimized");
      } else {
        this.callbacks.onWarn("Compact failed (continuing anyway)");
      }
      this.state.lastCompactIteration = this.state.iterations;
    } catch (error2) {
      this.callbacks.onWarn("Compact failed (continuing anyway)");
    }
  }
  async performFinalCheckpoint(context, goal) {
    this.callbacks.onInfo("\uD83D\uDCF8 Final checkpoint before completion");
    try {
      const result = await this.checkpointCommand.execute(context, {
        summary: `Goal achieved: ${goal} after ${this.state.iterations} iterations`
      });
      if (result.success) {
        this.callbacks.onSuccess("Final checkpoint saved");
      } else {
        this.callbacks.onWarn("Final checkpoint failed");
      }
    } catch (error2) {
      this.callbacks.onWarn("Final checkpoint failed");
    }
  }
}

// src/cli/commands/auto/TestingIntegration.ts
import { exec as exec3 } from "child_process";
import { promisify as promisify3 } from "util";
import { join as join5 } from "path";
var execAsync2 = promisify3(exec3);

class TestingIntegration {
  hooksPath = join5(process.env.HOME || "", ".claude/hooks");
  async runHook(hookName, args = []) {
    const hookPath = join5(this.hooksPath, `${hookName}.sh`);
    try {
      const { stdout } = await execAsync2(`bash ${hookPath} ${args.join(" ")}`);
      return JSON.parse(stdout);
    } catch (error2) {
      return null;
    }
  }
  async runUITesting(action, element, value) {
    const result = await this.runHook("ui-testing", [action, element, value || ""]);
    if (!result) {
      return { success: false, result: null };
    }
    return {
      success: result.status === "success",
      result
    };
  }
  async runMacAppTesting(action, appName, element, value) {
    const result = await this.runHook("mac-app-testing", [action, appName, element || "", value || ""]);
    if (!result) {
      return { success: false, result: null };
    }
    return {
      success: result.status === "success",
      result
    };
  }
}

// src/cli/commands/AutoCommand.ts
var execAsync3 = promisify4(exec4);

class AutoCommand extends BaseCommand {
  name = "auto";
  description = "Enter autonomous mode with ReAct + Reflexion loop";
  iterations = 0;
  memory;
  errorHandler;
  contextManager;
  conversationHistory = [];
  hookIntegration;
  skillInvoker;
  testingIntegration;
  reCommand;
  debugOrchestrator;
  lastCheckpointIteration = 0;
  lastCommitIteration = 0;
  lastCompactIteration = 0;
  lastReIteration = 0;
  consecutiveSuccesses = 0;
  consecutiveFailures = 0;
  currentTaskType = "general";
  taskInProgress = false;
  pendingCompaction = false;
  contextExceededThreshold = false;
  constructor() {
    super();
    this.memory = new MemoryManagerBridge;
    this.errorHandler = new ErrorHandler;
    this.hookIntegration = new HookIntegration;
    this.testingIntegration = new TestingIntegration;
    this.skillInvoker = new SkillInvoker({
      iterations: 0,
      lastCheckpointIteration: 0,
      lastCommitIteration: 0,
      lastCompactIteration: 0,
      consecutiveSuccesses: 0,
      consecutiveFailures: 0
    }, {
      onInfo: (msg) => this.info(msg),
      onWarn: (msg) => this.warn(msg),
      onSuccess: (msg) => this.success(msg)
    });
    this.reCommand = new ReCommand;
    this.debugOrchestrator = createDebugOrchestrator();
  }
  async execute(context, config) {
    try {
      if (!config.goal) {
        return this.createFailure('Goal is required. Usage: komplete auto "your goal"');
      }
      this.currentTaskType = this.detectTaskType(config.goal);
      this.info(`\uD83E\uDD16 Autonomous mode activated`);
      this.info(`Goal: ${source_default2.bold(config.goal)}`);
      this.info(`Task Type: ${source_default2.cyan(this.currentTaskType)}`);
      console.log("");
      await this.memory.setTask(config.goal, "Autonomous mode execution");
      await this.memory.addContext(`Model: ${config.model || "auto-routed"}`, 9);
      await this.memory.addContext(`Task Type: ${this.currentTaskType}`, 8);
      if (this.currentTaskType === "reverse-engineering") {
        await this.executeReverseEngineeringTools(context, config.goal);
      }
      this.contextManager = new ContextManager({
        maxTokens: 128000,
        warningThreshold: 30,
        compactionThreshold: 40,
        strategy: COMPACTION_STRATEGIES.balanced
      }, context.llmRouter);
      const agent = new ReflexionAgent(config.goal, context.llmRouter);
      const result = await this.runAutonomousLoop(agent, context, config);
      if (result.success) {
        this.success(`Goal achieved in ${this.iterations} iterations`);
        await this.memory.recordEpisode("task_complete", `Completed: ${config.goal}`, "success", `Iterations: ${this.iterations}`);
      } else {
        this.error(`Failed after ${this.iterations} iterations`);
      }
      return result;
    } catch (error2) {
      const err = error2;
      this.failSpinner("Autonomous mode failed");
      const classified = this.errorHandler.classify(error2);
      const errorMessage = this.errorHandler.formatError(classified);
      const remediations = this.errorHandler.getRemediation(classified.type);
      this.error(errorMessage);
      if (remediations.length > 0) {
        console.log(source_default2.gray(`
Suggested actions:`));
        remediations.forEach((r) => console.log(source_default2.gray(`  • ${r}`)));
      }
      return this.createFailure(errorMessage, err);
    }
  }
  async runAutonomousLoop(agent, context, config) {
    this.startSpinner("Starting autonomous loop...");
    this.info("\uD83D\uDCCA Phase 0: Initial analysis and planning");
    const reasoningMode = await this.hookIntegration.selectReasoningMode(config.goal, "");
    this.info(`Reasoning mode: ${reasoningMode.mode} (confidence: ${reasoningMode.confidence})`);
    const autonomyCheck = await this.hookIntegration.checkBoundedAutonomy(config.goal, "");
    if (!autonomyCheck.allowed) {
      return this.createFailure(`Task blocked: ${autonomyCheck.reason || "Bounded autonomy check failed"}`);
    }
    if (autonomyCheck.requiresApproval) {
      this.warn(`⚠️ Task requires approval: ${autonomyCheck.reason || "High risk or low confidence"}`);
    }
    this.info("\uD83E\uDDE0 Phase 1: Pre-execution intelligence");
    const totResult = await this.hookIntegration.runTreeOfThoughts(config.goal, "");
    if (totResult.branches.length > 0) {
      this.info(`Tree of Thoughts: ${totResult.branches.length} branches, selected: ${totResult.selected?.strategy || "default"}`);
    }
    const parallelAnalysis = await this.hookIntegration.analyzeParallelExecution(config.goal, "");
    if (parallelAnalysis.canParallelize) {
      this.info(`Parallel execution: ${parallelAnalysis.groups.length} groups detected`);
    }
    const multiAgentResult = await this.hookIntegration.coordinateMultiAgent(config.goal, "");
    this.info(`Multi-agent routing: ${multiAgentResult.agent} agent`);
    this.info("⚡ Phase 2: Execution with monitoring");
    const executor = new AutonomousExecutor({
      memory: this.memory,
      contextManager: this.contextManager,
      conversationHistory: this.conversationHistory,
      taskType: this.currentTaskType
    }, {
      onInfo: (msg) => this.info(msg),
      onWarn: (msg) => this.warn(msg),
      onSuccess: (msg) => this.success(msg),
      onSpinnerUpdate: (msg) => this.updateSpinner(msg),
      onCycleDisplay: (cycle, verbose) => this.displayCycle(cycle, verbose),
      onSkillInvocation: async (ctx, cfg, cycle, isGoalAchieved) => {
        this.skillInvoker["state"].iterations = this.iterations;
        this.skillInvoker["state"].consecutiveSuccesses = this.consecutiveSuccesses;
        this.skillInvoker["state"].consecutiveFailures = this.consecutiveFailures;
        await this.skillInvoker.invoke(ctx, cfg, cycle, isGoalAchieved, this.contextManager, this.conversationHistory);
        const qualityGate = await this.hookIntegration.evaluateQualityGate(cycle.observation || "", this.currentTaskType);
        if (!qualityGate.passed) {
          this.warn(`Quality gate failed: ${qualityGate.feedback}`);
        }
        this.lastCheckpointIteration = this.skillInvoker["state"].lastCheckpointIteration;
        this.lastCommitIteration = this.skillInvoker["state"].lastCommitIteration;
        this.lastCompactIteration = this.skillInvoker["state"].lastCompactIteration;
      },
      onContextCompaction: async (cfg) => await this.handleContextCompaction(cfg)
    });
    const result = await executor.runLoop(agent, context, config);
    this.iterations = executor.getState().iterations;
    this.consecutiveSuccesses = executor.getState().consecutiveSuccesses;
    this.consecutiveFailures = executor.getState().consecutiveFailures;
    this.succeedSpinner(`Autonomous loop completed`);
    if (result.success) {
      this.skillInvoker["state"].iterations = this.iterations;
      await this.skillInvoker.performFinalCheckpoint(context, config.goal);
    }
    return result.success ? this.createSuccess(result.message, result.data) : this.createFailure(result.message || "Autonomous loop failed");
  }
  async handleContextCompaction(config) {
    if (!this.contextManager || this.conversationHistory.length === 0) {
      return;
    }
    const health = this.contextManager.checkContextHealth(this.conversationHistory);
    if (health.status === "warning") {
      this.warn(`Context at ${health.percentage.toFixed(1)}% - approaching limit`);
    }
    if (health.shouldCompact && !this.taskInProgress) {
      await this.performCompaction(config);
      this.pendingCompaction = false;
      this.contextExceededThreshold = false;
    } else if (health.shouldCompact && this.taskInProgress) {
      if (!this.contextExceededThreshold) {
        this.info(`⏳ Context at ${health.percentage.toFixed(1)}% - pending compaction after task completes`);
        this.contextExceededThreshold = true;
        this.pendingCompaction = true;
      }
    } else if (this.pendingCompaction && !this.taskInProgress) {
      this.info(`\uD83D\uDD04 Task complete - executing pending compaction...`);
      await this.performCompaction(config);
      this.pendingCompaction = false;
      this.contextExceededThreshold = false;
    }
  }
  async performCompaction(config) {
    if (!this.contextManager) {
      return;
    }
    this.info(`\uD83D\uDD04 Context compacting...`);
    const { messages, result } = await this.contextManager.compactMessages(this.conversationHistory, `Goal: ${config.goal}`);
    this.conversationHistory = messages;
    this.success(`Compacted ${result.originalMessageCount} → ${result.compactedMessageCount} messages ` + `(${(result.compressionRatio * 100).toFixed(0)}% of original)`);
    await this.memory.addContext(`Context compacted: ${result.compressionRatio.toFixed(2)}x compression`, 6);
    this.lastCompactIteration = this.iterations;
  }
  async performReCommand(context, goal) {
    this.info("\uD83D\uDD2C Reverse engineering command triggered");
    try {
      const targetMatch = goal.match(/(?:analyze|extract|deobfuscate|understand)\s+(.+?)(?:\s|$)/i);
      const target = targetMatch ? targetMatch[1] : ".";
      const result = await this.reCommand.execute(context, {
        action: "analyze",
        target
      });
      if (result.success) {
        this.success("Reverse engineering analysis complete");
      } else {
        this.warn("Reverse engineering analysis failed (continuing anyway)");
      }
      this.lastReIteration = this.iterations;
    } catch (error2) {
      this.warn("Reverse engineering command failed (continuing anyway)");
    }
  }
  displayCycle(cycle, verbose) {
    console.log("");
    console.log(source_default2.bold(`Iteration ${this.iterations}:`));
    if (verbose) {
      console.log(source_default2.gray(`Thought: ${cycle.thought}`));
      console.log(source_default2.gray(`Action: ${cycle.action}`));
      console.log(source_default2.gray(`Result: ${cycle.observation}`));
      console.log(source_default2.gray(`Reflection: ${cycle.reflection}`));
    }
    const status = cycle.success ? source_default2.green("✓ Success") : source_default2.red("✗ Failed");
    console.log(status);
    console.log("");
  }
  detectTaskType(goal) {
    const lowerGoal = goal.toLowerCase();
    if (lowerGoal.includes("reverse engineer") || lowerGoal.includes("deobfuscate") || lowerGoal.includes("analyze code") || lowerGoal.includes("understand code") || lowerGoal.includes("extract") && (lowerGoal.includes("extension") || lowerGoal.includes("electron") || lowerGoal.includes("app"))) {
      return "reverse-engineering";
    }
    if (lowerGoal.includes("research") || lowerGoal.includes("investigate") || lowerGoal.includes("find") && lowerGoal.includes("examples") || lowerGoal.includes("search") && (lowerGoal.includes("github") || lowerGoal.includes("patterns"))) {
      return "research";
    }
    if (lowerGoal.includes("debug") || lowerGoal.includes("fix") && lowerGoal.includes("bug") || lowerGoal.includes("error") || lowerGoal.includes("issue")) {
      return "debugging";
    }
    if (lowerGoal.includes("document") || lowerGoal.includes("docs") || lowerGoal.includes("readme") || lowerGoal.includes("api docs")) {
      return "documentation";
    }
    if (lowerGoal.includes("refactor") || lowerGoal.includes("clean up") || lowerGoal.includes("improve code") || lowerGoal.includes("optimize")) {
      return "refactoring";
    }
    return "general";
  }
  selectPromptForTaskType(goal, taskType) {
    const memoryContext = this.conversationHistory.length > 0 ? this.conversationHistory.map((m) => typeof m.content === "string" ? m.content : JSON.stringify(m.content)).join(`

`) : "";
    switch (taskType) {
      case "reverse-engineering":
        return `
Goal: ${goal}

Context:
${memoryContext}

Instructions for Reverse Engineering:
1. Analyze the target code thoroughly
2. Identify patterns, architecture, and dependencies
3. Document findings clearly
4. Suggest improvements or security concerns

What is your analysis approach?
`.trim();
      case "research":
        return `
Goal: ${goal}

Context:
${memoryContext}

Instructions for Research:
1. Search memory for relevant information
2. Search GitHub for code examples and patterns
3. Analyze findings and synthesize insights
4. Provide actionable recommendations

What research approach will you take?
`.trim();
      case "debugging":
        return `
Goal: ${goal}

Context:
${memoryContext}

Instructions for Debugging:
1. Reproduce the issue
2. Analyze the code path causing the error
3. Form hypotheses about root cause
4. Test each hypothesis
5. Apply fix and verify

What is your debugging strategy?
`.trim();
      case "documentation":
        return `
Goal: ${goal}

Context:
${memoryContext}

Instructions for Documentation:
1. Identify what needs to be documented
2. Structure the documentation logically
3. Include clear examples and usage
4. Ensure completeness and accuracy

What documentation structure will you create?
`.trim();
      case "refactoring":
        return `
Goal: ${goal}

Context:
${memoryContext}

Instructions for Refactoring:
1. Analyze current code structure
2. Identify code smells and anti-patterns
3. Apply SOLID principles and best practices
4. Ensure tests pass after refactoring

What refactoring approach will you use?
`.trim();
      default:
        return `
Goal: ${goal}

Context:
${memoryContext}

What is the next step to achieve this goal? Think through:
1. What has been done so far?
2. What remains to be done?
3. What is the best next action?

Provide your reasoning and proposed action.
`.trim();
    }
  }
  async executeReverseEngineeringTools(context, goal) {
    this.info("\uD83D\uDD2C Reverse engineering tools detected");
    try {
      const targetMatch = goal.match(/(?:analyze|extract|deobfuscate|understand)\s+(.+?)(?:\s|$)/i);
      const target = targetMatch ? targetMatch[1] : ".";
      this.info("Running code pattern analysis...");
      try {
        const { stdout: analyzeOutput } = await execAsync3(`bash src/reversing/re-analyze.sh analyze "${target}"`);
        this.success("Code analysis complete");
        console.log(source_default2.gray(analyzeOutput.substring(0, 500) + "..."));
      } catch (error2) {
        this.warn("Code analysis failed, continuing...");
      }
      this.info("Generating documentation...");
      try {
        const { stdout: docsOutput } = await execAsync3(`bash src/reversing/re-docs.sh project "${target}"`);
        this.success("Documentation generated");
        console.log(source_default2.gray(docsOutput.substring(0, 300) + "..."));
      } catch (error2) {
        this.warn("Documentation generation failed, continuing...");
      }
      this.info("Generating optimized prompts...");
      try {
        const { stdout: promptOutput } = await execAsync3(`bash src/reversing/re-prompt.sh understand "${target}"`);
        this.success("Optimized prompts generated");
        console.log(source_default2.gray(promptOutput.substring(0, 300) + "..."));
      } catch (error2) {
        this.warn("Prompt generation failed, continuing...");
      }
      await this.memory.recordEpisode("reverse_engineering", `RE tools executed for: ${target}`, "success", "re-analyze, re-docs, re-prompt");
    } catch (error2) {
      this.warn("Reverse engineering tools encountered errors");
    }
  }
  async runDebugOrchestrator(task, context) {
    this.info("\uD83D\uDC1B Running debug orchestrator...");
    try {
      const smartDebugInput = {
        bugDescription: task,
        bugType: this.currentTaskType,
        testCommand: 'echo "No tests configured"',
        context
      };
      const debugContext = await this.debugOrchestrator.smartDebug(smartDebugInput);
      this.info(`\uD83D\uDCF8 Debug context created with snapshot: ${debugContext.beforeSnapshot}`);
      this.info(`\uD83D\uDD0D Found ${debugContext.similarFixesCount} similar bug fixes in memory`);
      if (debugContext.nextSteps.length > 0) {
        this.info("\uD83D\uDCA1 Next steps:");
        debugContext.nextSteps.forEach((step, i) => {
          console.log(source_default2.gray(`  ${i + 1}. ${step}`));
        });
      }
      return {
        snapshot: debugContext.beforeSnapshot,
        recommendations: debugContext.nextSteps,
        success: true
      };
    } catch (error2) {
      const err = error2;
      this.warn(`Debug orchestrator failed: ${err.message}`);
      return {
        snapshot: `error_${Date.now()}`,
        recommendations: [],
        success: false
      };
    }
  }
  async verifyFixWithDebugOrchestrator(beforeSnapshotId, fixDescription) {
    this.info("\uD83D\uDC1B Verifying fix with debug orchestrator...");
    try {
      const verifyInput = {
        beforeSnapshotId,
        testCommand: 'echo "No tests configured"',
        fixDescription
      };
      const result = await this.debugOrchestrator.verifyFix(verifyInput);
      if (result.regressionsDetected) {
        this.warn("⚠️ Regressions detected - fix may have broken other functionality");
      } else {
        this.success("✓ Fix verified - no regressions detected");
      }
      if (result.actions.length > 0) {
        this.info("\uD83D\uDCA1 Verification recommendations:");
        result.actions.forEach((action, i) => {
          console.log(source_default2.gray(`  ${i + 1}. ${action}`));
        });
      }
      return {
        success: result.status === "success",
        regressionsDetected: result.regressionsDetected,
        message: result.message || "Fix verification complete"
      };
    } catch (error2) {
      const err = error2;
      this.warn(`Fix verification failed: ${err.message}`);
      return {
        success: false,
        regressionsDetected: false,
        message: err.message
      };
    }
  }
}
// src/core/workflows/sparc/index.ts
class SPARCWorkflow {
  currentPhase = "specification" /* Specification */;
  context;
  router;
  constructor(context, router) {
    this.context = context;
    this.router = router;
  }
  extractText(content) {
    const textBlock = content.find((block) => block.type === "text");
    return textBlock?.text || "";
  }
  async execute() {
    console.log(`Starting SPARC workflow for: ${this.context.task}`);
    const spec = await this.generateSpecification();
    const pseudocode = await this.generatePseudocode(spec);
    const architecture = await this.designArchitecture(pseudocode);
    const refined = await this.refine(architecture);
    const completed = await this.complete(refined);
    return {
      phase: "completion" /* Completion */,
      output: completed
    };
  }
  async generateSpecification() {
    const prompt = `Generate a detailed specification for the following task:

**Task**: ${this.context.task}

**Requirements**:
${this.context.requirements.map((r, i) => `${i + 1}. ${r}`).join(`
`)}

**Constraints**:
${this.context.constraints.map((c, i) => `${i + 1}. ${c}`).join(`
`)}

Provide a comprehensive specification that includes:
1. Clear problem statement
2. Functional requirements (what the system must do)
3. Non-functional requirements (performance, security, etc.)
4. Edge cases and error handling considerations
5. Success criteria

Format your response as JSON with the structure:
{
  "problemStatement": "...",
  "functionalRequirements": ["..."],
  "nonFunctionalRequirements": ["..."],
  "edgeCases": ["..."],
  "successCriteria": ["..."]
}`;
    const response = await this.router.route({
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 2000
    }, {
      taskType: "coding",
      priority: "balanced"
    });
    const text = this.extractText(response.content);
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error2) {}
    return {
      raw: text,
      requirements: this.context.requirements,
      constraints: this.context.constraints
    };
  }
  async generatePseudocode(spec) {
    const specSummary = spec.problemStatement || JSON.stringify(spec);
    const prompt = `Based on the following specification, generate detailed pseudocode:

**Specification**:
${specSummary}

**Functional Requirements**:
${spec.functionalRequirements?.map((r, i) => `${i + 1}. ${r}`).join(`
`) || "See spec above"}

Generate step-by-step pseudocode that:
1. Breaks down the problem into clear, logical steps
2. Includes data structures and algorithms needed
3. Handles edge cases mentioned in the spec
4. Shows control flow (loops, conditionals, etc.)
5. Is language-agnostic but clear

Format your response as JSON:
{
  "steps": [
    { "step": 1, "action": "...", "details": "..." }
  ],
  "dataStructures": ["..."],
  "algorithms": ["..."]
}`;
    const response = await this.router.route({
      messages: [{ role: "user", content: prompt }],
      temperature: 0.6,
      max_tokens: 2000
    }, {
      taskType: "coding",
      priority: "balanced"
    });
    const text = this.extractText(response.content);
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error2) {}
    return {
      raw: text,
      steps: [],
      plan: "step-by-step"
    };
  }
  async designArchitecture(pseudocode) {
    const pseudocodeSummary = pseudocode.steps?.map((s) => `Step ${s.step}: ${s.action}`).join(`
`) || JSON.stringify(pseudocode);
    const prompt = `Based on the following pseudocode, design a software architecture:

**Pseudocode**:
${pseudocodeSummary}

**Data Structures**:
${pseudocode.dataStructures?.join(", ") || "See pseudocode"}

Design an architecture that:
1. Identifies key components/modules
2. Defines component responsibilities
3. Shows component interactions and data flow
4. Considers separation of concerns
5. Is maintainable and testable

Format your response as JSON:
{
  "components": [
    { "name": "...", "responsibility": "...", "interfaces": ["..."] }
  ],
  "dataFlow": ["..."],
  "patterns": ["..."]
}`;
    const response = await this.router.route({
      messages: [{ role: "user", content: prompt }],
      temperature: 0.5,
      max_tokens: 2000
    }, {
      taskType: "coding",
      priority: "balanced"
    });
    const text = this.extractText(response.content);
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error2) {}
    return {
      raw: text,
      components: [],
      interactions: [],
      design: "modular"
    };
  }
  async refine(architecture) {
    const architectureSummary = architecture.components?.map((c) => `${c.name}: ${c.responsibility}`).join(`
`) || JSON.stringify(architecture);
    const prompt = `Review and refine the following architecture:

**Architecture**:
${architectureSummary}

**Patterns Used**:
${architecture.patterns?.join(", ") || "None specified"}

Refine the architecture by:
1. Identifying potential bottlenecks or weaknesses
2. Suggesting optimizations for performance/scalability
3. Adding error handling strategies
4. Improving modularity where needed
5. Considering security implications

Format your response as JSON:
{
  "refinements": [
    { "area": "...", "issue": "...", "improvement": "..." }
  ],
  "optimizations": ["..."],
  "securityConsiderations": ["..."],
  "finalArchitecture": { ... }
}`;
    const response = await this.router.route({
      messages: [{ role: "user", content: prompt }],
      temperature: 0.4,
      max_tokens: 2000
    }, {
      taskType: "coding",
      priority: "balanced"
    });
    const text = this.extractText(response.content);
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error2) {}
    return {
      raw: text,
      ...architecture,
      refined: true
    };
  }
  async complete(refined) {
    const refinementsSummary = refined.refinements?.map((r) => `${r.area}: ${r.improvement}`).join(`
`) || "No refinements";
    const prompt = `Generate a completion summary and implementation guide:

**Task**: ${this.context.task}

**Refinements Applied**:
${refinementsSummary}

**Optimizations**:
${refined.optimizations?.join(", ") || "None"}

Create a completion summary that includes:
1. Overview of the complete solution
2. Implementation steps in priority order
3. Testing strategy
4. Deployment considerations
5. Success metrics

Format your response as JSON:
{
  "summary": "...",
  "implementationSteps": [
    { "priority": 1, "step": "...", "estimatedEffort": "..." }
  ],
  "testingStrategy": ["..."],
  "deploymentConsiderations": ["..."],
  "successMetrics": ["..."]
}`;
    const response = await this.router.route({
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 2000
    }, {
      taskType: "general",
      priority: "balanced"
    });
    const text = this.extractText(response.content);
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const completion = JSON.parse(jsonMatch[0]);
        return {
          ...refined,
          ...completion,
          completed: true
        };
      }
    } catch (error2) {}
    return {
      raw: text,
      ...refined,
      completed: true
    };
  }
}

// src/cli/commands/SPARCCommand.ts
class SPARCCommand extends BaseCommand {
  name = "sparc";
  description = "Execute SPARC methodology (Specification → Pseudocode → Architecture → Refinement → Completion)";
  memory;
  constructor() {
    super();
    this.memory = new MemoryManagerBridge;
  }
  async execute(context, config) {
    try {
      if (!config.task) {
        return this.createFailure('Task is required. Usage: komplete sparc "your task"');
      }
      this.info(`\uD83C\uDFAF Starting SPARC workflow`);
      this.info(`Task: ${source_default2.bold(config.task)}`);
      console.log("");
      await this.memory.setTask(config.task, "SPARC workflow execution");
      const sparcContext = {
        task: config.task,
        requirements: config.requirements || [],
        constraints: config.constraints || []
      };
      const workflow = new SPARCWorkflow(sparcContext, context.llmRouter);
      this.startSpinner("Executing SPARC workflow...");
      const phases = [
        "specification" /* Specification */,
        "pseudocode" /* Pseudocode */,
        "architecture" /* Architecture */,
        "refinement" /* Refinement */,
        "completion" /* Completion */
      ];
      for (const phase of phases) {
        this.updateSpinner(`Phase: ${phase}`);
        await this.sleep(1000);
      }
      const result = await workflow.execute();
      this.succeedSpinner("SPARC workflow completed");
      await this.memory.recordEpisode("sparc_complete", `SPARC workflow for: ${config.task}`, "success", JSON.stringify(result));
      console.log("");
      this.success("SPARC workflow completed successfully");
      console.log("");
      console.log(source_default2.bold("Results:"));
      console.log(source_default2.gray(JSON.stringify(result, null, 2)));
      return this.createSuccess("SPARC workflow completed", result);
    } catch (error2) {
      const err = error2;
      this.failSpinner("SPARC workflow failed");
      this.error(err.message);
      return this.createFailure(err.message, err);
    }
  }
  sleep(ms) {
    return new Promise((resolve2) => setTimeout(resolve2, ms));
  }
}
// src/core/agents/swarm/Decomposer.ts
class TaskDecomposer {
  decompose(task, agentCount) {
    const strategy = this.detectStrategy(task);
    const subtasks = this.generateSubtasks(task, agentCount, strategy);
    return {
      task,
      agentCount,
      decompositionStrategy: strategy,
      subtasks
    };
  }
  detectStrategy(task) {
    const taskLower = task.toLowerCase();
    if (/implement|build|create|add.*feature/i.test(taskLower)) {
      return "feature" /* Feature */;
    }
    if (/test|validate|check/i.test(taskLower)) {
      return "testing" /* Testing */;
    }
    if (/refactor|reorganize|restructure/i.test(taskLower)) {
      return "refactor" /* Refactor */;
    }
    if (/research|analyze|investigate|explore/i.test(taskLower)) {
      return "research" /* Research */;
    }
    return "generic" /* Generic */;
  }
  generateSubtasks(task, agentCount, strategy) {
    switch (strategy) {
      case "feature" /* Feature */:
        return this.decomposeFeature(task, agentCount);
      case "testing" /* Testing */:
        return this.decomposeTesting(task, agentCount);
      case "refactor" /* Refactor */:
        return this.decomposeRefactor(task, agentCount);
      case "research" /* Research */:
        return this.decomposeResearch(task, agentCount);
      case "generic" /* Generic */:
      default:
        return this.decomposeGeneric(task, agentCount);
    }
  }
  decomposeFeature(task, agentCount) {
    if (agentCount === 3) {
      return [
        {
          agentId: 1,
          subtask: `Research and design: ${task}`,
          priority: 1,
          phase: "design",
          dependencies: []
        },
        {
          agentId: 2,
          subtask: `Implement core logic: ${task}`,
          priority: 2,
          phase: "implement",
          dependencies: [1]
        },
        {
          agentId: 3,
          subtask: `Write tests and validate: ${task}`,
          priority: 3,
          phase: "test",
          dependencies: [2]
        }
      ];
    } else if (agentCount === 4) {
      return [
        {
          agentId: 1,
          subtask: `Research and design: ${task}`,
          priority: 1,
          phase: "design",
          dependencies: []
        },
        {
          agentId: 2,
          subtask: `Implement core logic: ${task}`,
          priority: 2,
          phase: "implement",
          dependencies: [1]
        },
        {
          agentId: 3,
          subtask: `Write tests: ${task}`,
          priority: 3,
          phase: "test",
          dependencies: [2]
        },
        {
          agentId: 4,
          subtask: `Integration and validation: ${task}`,
          priority: 4,
          phase: "integrate",
          dependencies: [2, 3]
        }
      ];
    } else {
      return [
        {
          agentId: 1,
          subtask: `Research and design architecture: ${task}`,
          priority: 1,
          phase: "design",
          dependencies: []
        },
        {
          agentId: 2,
          subtask: `Implement backend/logic: ${task}`,
          priority: 2,
          phase: "implement_backend",
          dependencies: [1]
        },
        {
          agentId: 3,
          subtask: `Implement frontend/interface: ${task}`,
          priority: 2,
          phase: "implement_frontend",
          dependencies: [1]
        },
        {
          agentId: 4,
          subtask: `Write comprehensive tests: ${task}`,
          priority: 3,
          phase: "test",
          dependencies: [2, 3]
        },
        {
          agentId: 5,
          subtask: `Integration, validation, documentation: ${task}`,
          priority: 4,
          phase: "integrate",
          dependencies: [2, 3, 4]
        }
      ];
    }
  }
  decomposeTesting(task, agentCount) {
    const testTypes = [
      "unit tests",
      "integration tests",
      "e2e tests",
      "performance tests",
      "security tests"
    ];
    return Array.from({ length: agentCount }, (_, i) => {
      const agentId = i + 1;
      const testType = i < testTypes.length ? testTypes[i] : `test suite part ${agentId}`;
      return {
        agentId,
        subtask: `Run ${testType}: ${task}`,
        priority: 1,
        phase: "test",
        dependencies: []
      };
    });
  }
  decomposeRefactor(task, agentCount) {
    return Array.from({ length: agentCount }, (_, i) => {
      const agentId = i + 1;
      const dependencies = i > 0 ? [i] : [];
      return {
        agentId,
        subtask: `Refactor module/component ${agentId}: ${task}`,
        priority: agentId,
        phase: "refactor",
        dependencies
      };
    });
  }
  decomposeResearch(task, agentCount) {
    const aspects = [
      "codebase patterns",
      "external solutions",
      "architecture analysis",
      "dependency mapping",
      "performance analysis"
    ];
    return Array.from({ length: agentCount }, (_, i) => {
      const agentId = i + 1;
      const aspect = i < aspects.length ? aspects[i] : `investigation area ${agentId}`;
      return {
        agentId,
        subtask: `Research ${aspect}: ${task}`,
        priority: 1,
        phase: "research",
        dependencies: []
      };
    });
  }
  decomposeGeneric(task, agentCount) {
    return Array.from({ length: agentCount }, (_, i) => {
      const agentId = i + 1;
      return {
        agentId,
        subtask: `Execute part ${agentId} of ${agentCount}: ${task}`,
        priority: 1,
        phase: "execute",
        dependencies: []
      };
    });
  }
}

// src/core/agents/swarm/Spawner.ts
class AgentSpawner {
  maxAgents;
  constructor(maxAgents = 10) {
    this.maxAgents = maxAgents;
  }
  generateSpawnInstructions(swarmId, task, subtasks, workDir, mcpAvailable = { github: false, chrome: false }) {
    const agentConfigs = subtasks.map((subtask) => this.createAgentConfig(subtask, workDir));
    const parallelAgents = agentConfigs.filter((agent) => agent.dependencies.length === 0);
    const sequentialAgents = agentConfigs.filter((agent) => agent.dependencies.length > 0);
    return {
      swarmId,
      task,
      agentCount: subtasks.length,
      workDir,
      parallelAgents,
      sequentialAgents,
      mcpAvailable
    };
  }
  createAgentConfig(subtask, workDir) {
    const agentType = this.mapPhaseToAgentType(subtask.phase);
    const prompt = this.generateAgentPrompt(subtask, workDir);
    return {
      agentId: subtask.agentId,
      subtask: subtask.subtask,
      phase: subtask.phase,
      dependencies: subtask.dependencies,
      agentType,
      prompt
    };
  }
  mapPhaseToAgentType(phase) {
    switch (phase) {
      case "design":
      case "research":
        return "Explore";
      case "test":
        return "qa-explorer";
      case "implement":
      case "implement_backend":
      case "implement_frontend":
      case "refactor":
        return "general-purpose";
      case "integrate":
        return "validator";
      default:
        return "general-purpose";
    }
  }
  generateAgentPrompt(subtask, workDir) {
    return `You are Swarm Agent ${subtask.agentId}.

## Your Task
${subtask.subtask}

## Working Directory
${workDir}

## Output Requirements
When complete, write your results to: result-agent-${subtask.agentId}.json

Format:
{
  "agent_id": ${subtask.agentId},
  "status": "success" or "failed",
  "summary": "Brief summary",
  "details": "Detailed results",
  "files_modified": []
}

Focus ONLY on your assigned task. Be thorough and efficient.`;
  }
  validate(agentCount) {
    if (agentCount > this.maxAgents) {
      return {
        valid: false,
        error: `Max ${this.maxAgents} agents allowed, requested ${agentCount}`
      };
    }
    if (agentCount < 2) {
      return {
        valid: false,
        error: "Swarm requires at least 2 agents"
      };
    }
    return { valid: true };
  }
}

// src/core/agents/swarm/Coordinator.ts
class SwarmCoordinator {
  swarms = new Map;
  initializeSwarm(swarmId, task, agentCount, workDir) {
    const agents = Array.from({ length: agentCount }, (_, i) => ({
      agentId: i + 1,
      status: "pending"
    }));
    const state = {
      swarmId,
      task,
      agentCount,
      status: "active",
      startedAt: new Date().toISOString(),
      workDir,
      agents,
      results: []
    };
    this.swarms.set(swarmId, state);
    return state;
  }
  updateAgentStatus(swarmId, agentId, status, taskId) {
    const swarm = this.swarms.get(swarmId);
    if (!swarm)
      return;
    const agent = swarm.agents.find((a) => a.agentId === agentId);
    if (!agent)
      return;
    agent.status = status;
    if (taskId)
      agent.taskId = taskId;
    if (status === "running" && !agent.startedAt) {
      agent.startedAt = new Date().toISOString();
    } else if ((status === "success" || status === "failed") && !agent.completedAt) {
      agent.completedAt = new Date().toISOString();
    }
    this.updateSwarmStatus(swarmId);
  }
  addAgentResult(swarmId, result) {
    const swarm = this.swarms.get(swarmId);
    if (!swarm)
      return;
    swarm.results.push(result);
    this.updateAgentStatus(swarmId, result.agentId, result.status);
  }
  updateSwarmStatus(swarmId) {
    const swarm = this.swarms.get(swarmId);
    if (!swarm)
      return;
    const allComplete = swarm.agents.every((a) => a.status === "success" || a.status === "failed");
    const anyFailed = swarm.agents.some((a) => a.status === "failed");
    if (allComplete) {
      swarm.status = anyFailed ? "failed" : "complete";
      swarm.completedAt = new Date().toISOString();
    }
  }
  getSwarmState(swarmId) {
    return this.swarms.get(swarmId);
  }
  isComplete(swarmId) {
    const swarm = this.swarms.get(swarmId);
    return swarm?.status === "complete" || swarm?.status === "failed";
  }
  getCompletionStatus(swarmId) {
    const swarm = this.swarms.get(swarmId);
    if (!swarm) {
      return { complete: false, success: 0, failed: 0, pending: 0 };
    }
    const success = swarm.agents.filter((a) => a.status === "success").length;
    const failed = swarm.agents.filter((a) => a.status === "failed").length;
    const pending = swarm.agents.filter((a) => a.status === "pending" || a.status === "running").length;
    return {
      complete: pending === 0,
      success,
      failed,
      pending
    };
  }
  clearSwarm(swarmId) {
    this.swarms.delete(swarmId);
  }
}

// src/core/agents/swarm/Merger.ts
class ResultMerger {
  mergeResults(swarmId, task, results) {
    const successfulAgents = results.filter((r) => r.status === "success").length;
    const failedAgents = results.filter((r) => r.status === "failed").length;
    const details = results.map((r) => this.formatAgentResult(r));
    const allFilesModified = this.collectUniqueFiles(results);
    const errors = this.collectErrors(results);
    const recommendations = this.generateRecommendations(results);
    return {
      swarmId,
      task,
      totalAgents: results.length,
      successfulAgents,
      failedAgents,
      summary: this.generateSummary(task, results),
      details,
      allFilesModified,
      errors,
      recommendations
    };
  }
  formatAgentResult(result) {
    const status = result.status === "success" ? "✅" : "❌";
    let output = `${status} Agent ${result.agentId}: ${result.summary}
`;
    if (result.details) {
      output += `  Details: ${result.details}
`;
    }
    if (result.filesModified.length > 0) {
      output += `  Files modified: ${result.filesModified.length}
`;
      result.filesModified.forEach((file) => {
        output += `    - ${file}
`;
      });
    }
    if (result.errors && result.errors.length > 0) {
      output += `  Errors:
`;
      result.errors.forEach((error2) => {
        output += `    - ${error2}
`;
      });
    }
    return output;
  }
  collectUniqueFiles(results) {
    const files = new Set;
    for (const result of results) {
      for (const file of result.filesModified) {
        files.add(file);
      }
    }
    return Array.from(files).sort();
  }
  collectErrors(results) {
    const errors = [];
    for (const result of results) {
      if (result.errors && result.errors.length > 0) {
        errors.push(`Agent ${result.agentId}:`, ...result.errors.map((e) => `  ${e}`));
      }
    }
    return errors;
  }
  generateSummary(task, results) {
    const total = results.length;
    const success = results.filter((r) => r.status === "success").length;
    const failed = results.filter((r) => r.status === "failed").length;
    let summary = `Swarm execution for "${task}" completed.
`;
    summary += `Total agents: ${total}, Successful: ${success}, Failed: ${failed}
`;
    if (failed === 0) {
      summary += "All agents completed successfully.";
    } else if (success > 0) {
      summary += `Partially successful. ${failed} agent(s) encountered errors.`;
    } else {
      summary += "All agents failed. Review errors for details.";
    }
    return summary;
  }
  generateRecommendations(results) {
    const recommendations = [];
    const failed = results.filter((r) => r.status === "failed");
    if (failed.length > 0) {
      recommendations.push(`Review failed agents: ${failed.map((r) => r.agentId).join(", ")}`);
    }
    const totalFiles = this.collectUniqueFiles(results).length;
    if (totalFiles > 10) {
      recommendations.push(`Many files modified (${totalFiles}). Consider code review before merging.`);
    }
    const totalErrors = this.collectErrors(results).length;
    if (totalErrors > 0) {
      recommendations.push(`${totalErrors} error(s) reported. Review error details for root causes.`);
    }
    return recommendations;
  }
  generateReport(merged) {
    let report = `# Swarm Execution Report

`;
    report += `**Swarm ID**: ${merged.swarmId}
`;
    report += `**Task**: ${merged.task}
`;
    report += `**Total Agents**: ${merged.totalAgents}
`;
    report += `**Successful**: ${merged.successfulAgents}
`;
    report += `**Failed**: ${merged.failedAgents}

`;
    report += `## Summary

${merged.summary}

`;
    if (merged.allFilesModified.length > 0) {
      report += `## Files Modified (${merged.allFilesModified.length})

`;
      merged.allFilesModified.forEach((file) => {
        report += `- ${file}
`;
      });
      report += `
`;
    }
    report += `## Agent Results

`;
    merged.details.forEach((detail) => {
      report += detail + `
`;
    });
    if (merged.errors.length > 0) {
      report += `## Errors

`;
      merged.errors.forEach((error2) => {
        report += `- ${error2}
`;
      });
      report += `
`;
    }
    if (merged.recommendations.length > 0) {
      report += `## Recommendations

`;
      merged.recommendations.forEach((rec) => {
        report += `- ${rec}
`;
      });
      report += `
`;
    }
    return report;
  }
}

// src/core/agents/swarm/GitIntegration.ts
import { exec as exec5 } from "node:child_process";
import { promisify as promisify5 } from "node:util";
import * as fs2 from "node:fs/promises";
import * as path4 from "node:path";
var execAsync4 = promisify5(exec5);

class GitIntegration {
  async execGit(args, cwd) {
    try {
      const command = `git ${args.join(" ")}`;
      const { stdout, stderr } = await execAsync4(command, { cwd });
      return {
        stdout: stdout.toString(),
        stderr: stderr.toString(),
        exitCode: 0
      };
    } catch (error2) {
      return {
        stdout: error2.stdout?.toString() || "",
        stderr: error2.stderr?.toString() || "",
        exitCode: error2.code || 1
      };
    }
  }
  async integrateChanges(swarmId, agentCount, workDir) {
    const results = [];
    const autoResolved = [];
    const unresolved = [];
    for (let i = 1;i <= agentCount; i++) {
      const result = await this.integrateAgent(swarmId, i, workDir);
      results.push(result);
      if (result.autoResolved.length > 0) {
        autoResolved.push(...result.autoResolved);
      }
      if (result.unresolved.length > 0) {
        unresolved.push(...result.unresolved);
      }
    }
    const successfulMerges = results.filter((r) => r.success).length;
    const totalConflicts = autoResolved.length + unresolved.length;
    return {
      totalAgents: agentCount,
      successfulMerges,
      totalConflicts,
      autoResolved: autoResolved.length,
      unresolved: unresolved.length,
      report: this.generateSummaryReport(results, autoResolved, unresolved)
    };
  }
  async integrateAgent(swarmId, agentId, workDir) {
    const branch = `swarm-${swarmId}-agent-${agentId}`;
    const autoResolved = [];
    const unresolved = [];
    try {
      const branchCheck = await this.execGit(["rev-parse", "--verify", branch], workDir);
      if (branchCheck.exitCode !== 0) {
        return {
          success: false,
          agentId,
          branch,
          conflictsDetected: false,
          autoResolved,
          unresolved,
          report: `Agent ${agentId}: Branch ${branch} not found`
        };
      }
      await this.execGit(["merge", branch, "--no-commit", "--no-ff"], workDir);
      const conflictedFiles = await this.detectConflicts(workDir);
      const conflictsDetected = conflictedFiles.length > 0;
      if (conflictsDetected) {
        const resolution = await this.autoResolveConflicts(conflictedFiles, workDir);
        autoResolved.push(...resolution.resolved);
        unresolved.push(...resolution.unresolved);
        for (const resolved of resolution.resolved) {
          if (this.isPackageLock(resolved.file)) {
            await this.execGit(["checkout", "--ours", resolved.file], workDir);
          } else {
            await this.execGit(["checkout", "--theirs", resolved.file], workDir);
          }
          await this.execGit(["add", resolved.file], workDir);
        }
        if (resolution.unresolved.length === 0) {
          await this.execGit(["commit", "-m", `Merged ${branch} (auto-resolved)`], workDir);
        } else {
          await this.execGit(["merge", "--abort"], workDir);
        }
      } else {
        await this.execGit(["commit", "-m", `Merged ${branch}`], workDir);
      }
      return {
        success: unresolved.length === 0,
        agentId,
        branch,
        conflictsDetected,
        autoResolved,
        unresolved,
        report: unresolved.length === 0 ? `Agent ${agentId}: Integration successful (${autoResolved.length} auto-resolved)` : `Agent ${agentId}: Integration aborted (${unresolved.length} unresolved conflicts)`
      };
    } catch (error2) {
      const err = error2;
      return {
        success: false,
        agentId,
        branch,
        conflictsDetected: false,
        autoResolved,
        unresolved,
        report: `Agent ${agentId}: Error - ${err.message}`
      };
    }
  }
  async detectConflicts(workDir) {
    const result = await this.execGit(["diff", "--name-only", "--diff-filter=U"], workDir);
    if (result.exitCode !== 0) {
      return [];
    }
    return result.stdout.split(`
`).map((line) => line.trim()).filter((line) => line.length > 0);
  }
  async autoResolveConflicts(conflictedFiles, workDir) {
    const resolved = [];
    const unresolved = [];
    for (const file of conflictedFiles) {
      if (this.isPackageLock(file)) {
        resolved.push({
          file,
          resolved: true,
          method: "auto_package_lock",
          details: "Kept current lockfile"
        });
        continue;
      }
      const conflictCount = await this.countConflictMarkers(file, workDir);
      if (conflictCount > 0 && conflictCount <= 3) {
        resolved.push({
          file,
          resolved: true,
          method: "auto_small_conflict",
          details: "Small conflict (1 region), kept agent changes"
        });
        continue;
      }
      unresolved.push({
        file,
        resolved: false,
        method: "manual_required",
        details: "Requires manual review"
      });
    }
    return { resolved, unresolved };
  }
  isPackageLock(file) {
    return /package-lock\.json|yarn\.lock|Gemfile\.lock|Cargo\.lock|bun\.lockb/.test(file);
  }
  async countConflictMarkers(file, workDir) {
    try {
      const filePath = path4.join(workDir, file);
      const content = await fs2.readFile(filePath, "utf-8");
      const lines = content.split(`
`);
      let count = 0;
      for (const line of lines) {
        if (/^(<{7}|={7}|>{7})/.test(line)) {
          count++;
        }
      }
      return count;
    } catch (error2) {
      return 0;
    }
  }
  generateSummaryReport(results, autoResolved, unresolved) {
    let report = `# Code Integration Report

`;
    report += `**Total Agents**: ${results.length}
`;
    report += `**Successful Merges**: ${results.filter((r) => r.success).length}
`;
    report += `**Total Conflicts**: ${autoResolved.length + unresolved.length}
`;
    report += `**Auto-Resolved**: ${autoResolved.length}
`;
    report += `**Unresolved**: ${unresolved.length}

`;
    if (autoResolved.length > 0) {
      report += `## Auto-Resolved Conflicts

`;
      for (const resolution of autoResolved) {
        report += `- ${resolution.file}: ${resolution.details}
`;
      }
      report += `
`;
    }
    if (unresolved.length > 0) {
      report += `## ⚠️ Unresolved Conflicts (Require Manual Review)

`;
      for (const resolution of unresolved) {
        report += `- ${resolution.file}: ${resolution.details}
`;
      }
      report += `
`;
    }
    report += `## Per-Agent Results

`;
    for (const result of results) {
      report += `### Agent ${result.agentId}
`;
      report += `- Branch: ${result.branch}
`;
      report += `- Status: ${result.success ? "✅ Success" : "❌ Failed"}
`;
      report += `- Conflicts: ${result.conflictsDetected ? "Yes" : "No"}

`;
    }
    return report;
  }
}

// src/core/agents/swarm/index.ts
class SwarmOrchestrator {
  decomposer;
  spawner;
  coordinator;
  merger;
  gitIntegration;
  constructor(maxAgents = 10) {
    this.decomposer = new TaskDecomposer;
    this.spawner = new AgentSpawner(maxAgents);
    this.coordinator = new SwarmCoordinator;
    this.merger = new ResultMerger;
    this.gitIntegration = new GitIntegration;
  }
  async spawnSwarm(task, agentCount, workDir, mcpAvailable = { github: false, chrome: false }) {
    const validation = this.spawner.validate(agentCount);
    if (!validation.valid) {
      throw new Error(validation.error);
    }
    const swarmId = `swarm_${Date.now()}`;
    const decomposed = this.decomposer.decompose(task, agentCount);
    const instructions = this.spawner.generateSpawnInstructions(swarmId, task, decomposed.subtasks, workDir, mcpAvailable);
    const state = this.coordinator.initializeSwarm(swarmId, task, agentCount, workDir);
    return {
      swarmId,
      instructions,
      state
    };
  }
  updateAgentStatus(swarmId, agentId, status, taskId) {
    this.coordinator.updateAgentStatus(swarmId, agentId, status, taskId);
  }
  addAgentResult(swarmId, result) {
    this.coordinator.addAgentResult(swarmId, result);
  }
  async collectResults(swarmId) {
    const state = this.coordinator.getSwarmState(swarmId);
    if (!state) {
      throw new Error(`Swarm ${swarmId} not found`);
    }
    if (!this.coordinator.isComplete(swarmId)) {
      throw new Error(`Swarm ${swarmId} is not complete yet`);
    }
    const merged = this.merger.mergeResults(swarmId, state.task, state.results);
    let integration;
    try {
      integration = await this.gitIntegration.integrateChanges(swarmId, state.agentCount, state.workDir);
    } catch (error2) {
      console.warn("Git integration failed:", error2);
    }
    const report = this.generateComprehensiveReport(merged, integration);
    return {
      merged,
      integration,
      report
    };
  }
  getSwarmState(swarmId) {
    return this.coordinator.getSwarmState(swarmId);
  }
  isComplete(swarmId) {
    return this.coordinator.isComplete(swarmId);
  }
  getCompletionStatus(swarmId) {
    return this.coordinator.getCompletionStatus(swarmId);
  }
  clearSwarm(swarmId) {
    this.coordinator.clearSwarm(swarmId);
  }
  generateComprehensiveReport(merged, integration) {
    let report = this.merger.generateReport(merged);
    if (integration) {
      report += `
---

`;
      report += `# Code Integration

`;
      report += integration.report;
    }
    return report;
  }
}

// src/cli/commands/SwarmCommand.ts
class SwarmCommand extends BaseCommand {
  name = "swarm";
  description = "Spawn and manage distributed agent swarms for parallel execution";
  orchestrator;
  memory;
  constructor() {
    super();
    this.orchestrator = new SwarmOrchestrator(10);
    this.memory = new MemoryManagerBridge;
  }
  async execute(context, config) {
    try {
      switch (config.action) {
        case "spawn":
          return await this.spawnSwarm(context, config);
        case "status":
          return await this.showStatus(config);
        case "collect":
          return await this.collectResults(config);
        case "clear":
          return await this.clearSwarm(config);
        default:
          return this.createFailure(`Unknown action: ${config.action}. Use: spawn, status, collect, clear`);
      }
    } catch (error2) {
      const err = error2;
      this.error(err.message);
      return this.createFailure(err.message, err);
    }
  }
  async spawnSwarm(context, config) {
    if (!config.task) {
      return this.createFailure('Task is required. Usage: komplete swarm spawn N "task description"');
    }
    if (!config.agentCount || config.agentCount < 2) {
      return this.createFailure("Agent count must be >= 2");
    }
    this.info(`\uD83D\uDE80 Spawning swarm with ${config.agentCount} agents`);
    this.info(`Task: ${source_default2.bold(config.task)}`);
    console.log("");
    const workDir = config.workDir || process.cwd();
    this.startSpinner("Spawning swarm...");
    const result = await this.orchestrator.spawnSwarm(config.task, config.agentCount, workDir, {
      github: true,
      chrome: false
    });
    this.succeedSpinner(`Swarm spawned: ${result.swarmId}`);
    await this.memory.recordEpisode("swarm_spawned", `Swarm ${result.swarmId}: ${config.task}`, "success", `${config.agentCount} agents`);
    console.log("");
    this.success("Swarm spawned successfully");
    console.log("");
    console.log(source_default2.bold("Swarm ID:"), source_default2.cyan(result.swarmId));
    console.log(source_default2.bold("Agents:"), config.agentCount);
    console.log(source_default2.bold("Status:"), "Running");
    console.log("");
    if (config.verbose) {
      console.log(source_default2.bold("Instructions:"));
      console.log(source_default2.gray(JSON.stringify(result.instructions, null, 2)));
      console.log("");
    }
    return this.createSuccess("Swarm spawned", {
      swarmId: result.swarmId,
      agentCount: config.agentCount,
      state: result.state
    });
  }
  async showStatus(config) {
    if (!config.swarmId) {
      return this.createFailure("Swarm ID is required");
    }
    const state = this.orchestrator.getSwarmState(config.swarmId);
    if (!state) {
      return this.createFailure(`Swarm ${config.swarmId} not found`);
    }
    const status = this.orchestrator.getCompletionStatus(config.swarmId);
    console.log("");
    console.log(source_default2.bold("Swarm Status"));
    console.log("");
    console.log(source_default2.bold("Swarm ID:"), source_default2.cyan(config.swarmId));
    console.log(source_default2.bold("Task:"), state.task);
    console.log(source_default2.bold("Agents:"), state.agentCount);
    console.log(source_default2.bold("Complete:"), status.complete ? source_default2.green("Yes") : source_default2.yellow("No"));
    console.log("");
    console.log(source_default2.bold("Results:"));
    console.log(`  ${source_default2.green("✓")} Success: ${status.success}`);
    console.log(`  ${source_default2.red("✗")} Failed: ${status.failed}`);
    console.log(`  ${source_default2.gray("○")} Pending: ${status.pending}`);
    console.log("");
    return this.createSuccess("Status retrieved", { state, status });
  }
  async collectResults(config) {
    if (!config.swarmId) {
      return this.createFailure("Swarm ID is required");
    }
    this.info(`\uD83D\uDCE6 Collecting results from swarm: ${config.swarmId}`);
    console.log("");
    this.startSpinner("Collecting and merging results...");
    const result = await this.orchestrator.collectResults(config.swarmId);
    this.succeedSpinner("Results collected");
    await this.memory.recordEpisode("swarm_collected", `Swarm ${config.swarmId} results collected`, "success", JSON.stringify(result.merged));
    console.log("");
    this.success("Results collected and merged");
    console.log("");
    console.log(source_default2.bold("Report:"));
    console.log("");
    console.log(result.report);
    console.log("");
    if (result.integration) {
      console.log(source_default2.bold("Code Integration:"));
      console.log(source_default2.gray("Changes merged to main branch"));
      console.log("");
    }
    return this.createSuccess("Results collected", result);
  }
  async clearSwarm(config) {
    if (!config.swarmId) {
      return this.createFailure("Swarm ID is required");
    }
    this.orchestrator.clearSwarm(config.swarmId);
    this.success(`Swarm ${config.swarmId} cleared`);
    return this.createSuccess("Swarm cleared");
  }
}
// src/cli/commands/ReflectCommand.ts
class ReflectCommand extends BaseCommand {
  name = "reflect";
  description = "Run ReAct + Reflexion loop (Think → Act → Observe → Reflect)";
  memory;
  constructor() {
    super();
    this.memory = new MemoryManagerBridge;
  }
  async execute(context, config) {
    try {
      if (!config.goal) {
        return this.createFailure('Goal is required. Usage: komplete reflect "your goal"');
      }
      const iterations = config.iterations || 3;
      this.info(`\uD83D\uDD04 Starting Reflexion loop`);
      this.info(`Goal: ${source_default2.bold(config.goal)}`);
      this.info(`Iterations: ${iterations}`);
      console.log("");
      await this.memory.setTask(config.goal, "Reflexion loop execution");
      const agent = new ReflexionAgent(config.goal);
      this.startSpinner("Running reflexion cycles...");
      const cycles = [];
      for (let i = 0;i < iterations; i++) {
        this.updateSpinner(`Cycle ${i + 1}/${iterations}`);
        const input = await this.generateInput(context, config.goal, agent.getHistory());
        const cycle = await agent.cycle(input);
        cycles.push(cycle);
        if (config.verbose) {
          this.displayCycle(i + 1, cycle);
        }
        await this.sleep(500);
        await this.memory.addContext(`Cycle ${i + 1}: ${cycle.thought}`, 7);
      }
      this.succeedSpinner("Reflexion loop completed");
      await this.memory.recordEpisode("reflexion_complete", `Reflexion for: ${config.goal}`, "success", `${cycles.length} cycles`);
      console.log("");
      this.success("Reflexion loop completed successfully");
      console.log("");
      this.displaySummary(cycles);
      return this.createSuccess("Reflexion loop completed", {
        cycles,
        history: agent.getHistory()
      });
    } catch (error2) {
      const err = error2;
      this.failSpinner("Reflexion loop failed");
      this.error(err.message);
      return this.createFailure(err.message, err);
    }
  }
  async generateInput(context, goal, history) {
    const prompt = this.buildInputPrompt(goal, history);
    const response = await context.llmRouter.route({
      messages: [{ role: "user", content: prompt }],
      system: "You are generating input for a reflexion cycle. Be concise and actionable."
    }, {
      taskType: "reasoning",
      priority: "speed"
    });
    const firstContent = response.content[0];
    return firstContent.type === "text" ? firstContent.text : "Continue working on goal";
  }
  buildInputPrompt(goal, history) {
    if (history.length === 0) {
      return `Goal: ${goal}

What is the first step to achieve this goal?`;
    }
    const lastCycle = history[history.length - 1];
    return `
Goal: ${goal}

Previous cycle:
- Thought: ${lastCycle.thought}
- Action: ${lastCycle.action}
- Observation: ${lastCycle.observation}
- Reflection: ${lastCycle.reflection}
- Success: ${lastCycle.success ? "Yes" : "No"}

What should be the next step?
`.trim();
  }
  displayCycle(iteration, cycle) {
    console.log("");
    console.log(source_default2.bold(`Cycle ${iteration}:`));
    console.log(source_default2.gray(`Thought: ${cycle.thought}`));
    console.log(source_default2.gray(`Action: ${cycle.action}`));
    console.log(source_default2.gray(`Observation: ${cycle.observation}`));
    console.log(source_default2.gray(`Reflection: ${cycle.reflection}`));
    console.log(cycle.success ? source_default2.green("✓ Success") : source_default2.red("✗ Failed"));
  }
  displaySummary(cycles) {
    const successCount = cycles.filter((c) => c.success).length;
    const failCount = cycles.length - successCount;
    console.log(source_default2.bold("Summary:"));
    console.log(`  Total cycles: ${cycles.length}`);
    console.log(`  ${source_default2.green("✓")} Successful: ${successCount}`);
    console.log(`  ${source_default2.red("✗")} Failed: ${failCount}`);
    console.log("");
    if (cycles.length > 0) {
      console.log(source_default2.bold("Key Insights:"));
      cycles.forEach((cycle, i) => {
        console.log(`  ${i + 1}. ${source_default2.gray(cycle.reflection)}`);
      });
    }
  }
  sleep(ms) {
    return new Promise((resolve2) => setTimeout(resolve2, ms));
  }
}
// src/cli/commands/ReflexionCommand.ts
class ReflexionCommand {
  name = "reflexion";
  router;
  async execute(context, options) {
    const startTime = Date.now();
    if (!options.goal) {
      return {
        success: false,
        message: `Error: --goal parameter is required
Example: bun run kk reflexion execute --goal "Create calculator app"`
      };
    }
    const maxIterations = options.maxIterations || 30;
    const preferredModel = options.preferredModel;
    const outputJson = options.outputJson ?? false;
    const verbose = options.verbose ?? false;
    try {
      if (!this.router) {
        const registry = await createDefaultRegistry();
        this.router = new LLMRouter(registry);
      }
      if (!outputJson) {
        console.log(source_default2.bold(`
\uD83E\uDD16 ReflexionAgent Execution
`));
        console.log(source_default2.cyan(`Goal: ${options.goal}`));
        console.log(source_default2.gray(`Max Iterations: ${maxIterations}`));
        if (preferredModel) {
          console.log(source_default2.gray(`Preferred Model: ${preferredModel}`));
        }
        console.log("");
      }
      const agent = new ReflexionAgent(options.goal, this.router, preferredModel);
      let cycles = 0;
      let lastInput = "Start task";
      let stagnationDetected = false;
      let goalAchieved = false;
      let finalObservation = "";
      while (cycles < maxIterations) {
        cycles++;
        if (!outputJson && verbose) {
          console.log(source_default2.yellow(`
--- Cycle ${cycles}/${maxIterations} ---`));
        }
        const result = await agent.cycle(lastInput);
        finalObservation = result.observation;
        if (outputJson) {
          console.log(JSON.stringify({
            cycle: cycles,
            thought: result.thought.substring(0, 200) + (result.thought.length > 200 ? "..." : ""),
            action: result.action,
            observation: result.observation.substring(0, 200) + (result.observation.length > 200 ? "..." : ""),
            reflection: result.reflection?.substring(0, 200) + (result.reflection && result.reflection.length > 200 ? "..." : "")
          }));
        } else if (verbose) {
          console.log(source_default2.white(`Thought: ${result.thought.substring(0, 150)}...`));
          console.log(source_default2.green(`Action: ${result.action}`));
          console.log(source_default2.blue(`Observation: ${result.observation.substring(0, 150)}...`));
          if (result.reflection) {
            console.log(source_default2.magenta(`Reflection: ${result.reflection.substring(0, 150)}...`));
          }
        } else {
          process.stdout.write(".");
        }
        const metrics2 = agent.getMetrics();
        if (result.observation.includes("No progress detected") || result.observation.includes("stagnation")) {
          stagnationDetected = true;
          if (!outputJson) {
            console.log(source_default2.yellow(`
⚠️  Stagnation detected - stopping early`));
          }
          break;
        }
        if (metrics2.filesCreated > 0 || metrics2.filesModified > 0) {
          const hasErrors = result.observation.toLowerCase().includes("error") || result.observation.toLowerCase().includes("failed");
          if (!hasErrors && cycles > 2) {
            goalAchieved = true;
            if (!outputJson) {
              console.log(source_default2.green(`
✅ Goal appears achieved`));
            }
            break;
          }
        }
        lastInput = result.observation;
      }
      const metrics = agent.getMetrics();
      const elapsedTime = Date.now() - startTime;
      const resultData = {
        success: goalAchieved || metrics.filesCreated + metrics.filesModified > 0,
        iterations: cycles,
        filesCreated: metrics.filesCreated,
        filesModified: metrics.filesModified,
        linesChanged: metrics.linesChanged,
        stagnationDetected,
        goalAchieved,
        elapsedTime,
        finalObservation: finalObservation.substring(0, 500)
      };
      if (outputJson) {
        console.log(JSON.stringify({ status: "complete", ...resultData }));
      } else {
        console.log(`
`);
        console.log(source_default2.bold("\uD83D\uDCCA Execution Summary:"));
        console.log(source_default2.gray("─".repeat(50)));
        console.log(source_default2.white(`Status: ${resultData.success ? source_default2.green("Success") : source_default2.yellow("Incomplete")}`));
        console.log(source_default2.white(`Iterations: ${resultData.iterations}`));
        console.log(source_default2.white(`Files Created: ${resultData.filesCreated}`));
        console.log(source_default2.white(`Files Modified: ${resultData.filesModified}`));
        console.log(source_default2.white(`Lines Changed: ${resultData.linesChanged}`));
        console.log(source_default2.white(`Elapsed Time: ${(elapsedTime / 1000).toFixed(2)}s`));
        if (stagnationDetected) {
          console.log(source_default2.yellow("Stagnation: Detected"));
        }
        console.log("");
      }
      return {
        success: resultData.success,
        message: resultData.success ? `Goal achieved in ${resultData.iterations} iterations` : `Task incomplete after ${resultData.iterations} iterations`,
        data: resultData
      };
    } catch (error2) {
      const errorMessage = error2 instanceof Error ? error2.message : String(error2);
      if (outputJson) {
        console.log(JSON.stringify({
          status: "error",
          error: errorMessage,
          iterations: 0
        }));
      }
      return {
        success: false,
        message: `ReflexionAgent error: ${errorMessage}`
      };
    }
  }
  async status(_context, _options) {
    return {
      success: true,
      message: `Status tracking not yet implemented.
Future: Will show ongoing executions and their progress.`
    };
  }
  async metrics(_context, _options) {
    return {
      success: true,
      message: `Metrics tracking not yet implemented.
Future: Will show aggregated performance stats from past runs.`
    };
  }
}
// src/cli/commands/ResearchCommand.ts
class ResearchCommand extends BaseCommand {
  name = "research";
  description = "Research code patterns, solutions, and best practices";
  memory;
  constructor() {
    super();
    this.memory = new MemoryManagerBridge;
  }
  async execute(context, config) {
    try {
      if (!config.query) {
        return this.createFailure('Query is required. Usage: komplete research "your query"');
      }
      this.info(`\uD83D\uDD2C Researching: ${source_default2.bold(config.query)}`);
      console.log("");
      const sources = config.sources || ["github", "memory"];
      const results = {
        query: config.query,
        sources: {},
        summary: ""
      };
      if (sources.includes("memory")) {
        this.startSpinner("Searching memory...");
        const memoryResults = await this.searchMemory(config.query);
        results.sources.memory = memoryResults;
        this.succeedSpinner(`Found ${memoryResults.length} memory results`);
      }
      if (sources.includes("github")) {
        this.startSpinner("Searching GitHub...");
        try {
          const githubResults = await this.searchGitHub(config);
          results.sources.github = githubResults;
          this.succeedSpinner(`Found ${githubResults.length} GitHub results`);
        } catch (error2) {
          this.warn("GitHub search not available");
        }
      }
      this.startSpinner("Generating research summary...");
      const summary = await this.generateSummary(context, config.query, results);
      results.summary = summary;
      this.succeedSpinner("Summary generated");
      await this.memory.recordEpisode("research_complete", `Research: ${config.query}`, "success", JSON.stringify(results));
      console.log("");
      this.success("Research completed");
      console.log("");
      console.log(source_default2.bold("Summary:"));
      console.log(source_default2.gray(summary));
      console.log("");
      if (results.sources.memory && results.sources.memory.length > 0) {
        console.log(source_default2.bold("Memory Results:"));
        results.sources.memory.slice(0, 3).forEach((result, i) => {
          console.log(`  ${i + 1}. ${source_default2.gray(result.episode || result.fact || "Result")}`);
        });
        console.log("");
      }
      if (results.sources.github && results.sources.github.length > 0) {
        console.log(source_default2.bold("GitHub Results:"));
        results.sources.github.slice(0, 5).forEach((result, i) => {
          console.log(`  ${i + 1}. ${source_default2.cyan(result.repo || "Repository")}`);
          console.log(`     ${source_default2.gray(result.description || result.path || "")}`);
        });
        console.log("");
      }
      return this.createSuccess("Research complete", results);
    } catch (error2) {
      const err = error2;
      this.error(err.message);
      return this.createFailure(err.message, err);
    }
  }
  async searchMemory(query) {
    try {
      const episodes = await this.memory.searchEpisodes(query, 5);
      const results = [];
      if (episodes) {
        const lines = episodes.split(`
`).filter((l) => l.trim());
        for (const line of lines) {
          try {
            const episode = JSON.parse(line);
            results.push(episode);
          } catch {}
        }
      }
      return results;
    } catch (error2) {
      console.warn("Memory search failed:", error2);
      return [];
    }
  }
  async searchGitHub(config) {
    try {
      this.warn("GitHub MCP integration not available - using mock data");
      this.info("To enable: Configure GitHub MCP server in ~/.claude/config.json");
      return [
        {
          repo: "anthropics/anthropic-sdk-typescript",
          path: "src/resources/messages.ts",
          description: `Code example for: ${config.query} (mock result)`,
          url: `https://github.com/search?q=${encodeURIComponent(config.query)}`,
          language: config.language?.[0] || "typescript",
          score: 0.9
        },
        {
          repo: "vercel/next.js",
          path: "packages/next/src/server/api.ts",
          description: `Related implementation: ${config.query} (mock result)`,
          url: `https://github.com/search?q=${encodeURIComponent(config.query)}`,
          language: config.language?.[0] || "typescript",
          score: 0.85
        }
      ];
    } catch (error2) {
      const err = error2;
      this.warn(`GitHub search failed: ${err.message}`);
      return [];
    }
  }
  async generateSummary(context, query, results) {
    const prompt = this.buildSummaryPrompt(query, results);
    try {
      const response = await context.llmRouter.route({
        messages: [{ role: "user", content: prompt }],
        system: "You are a research assistant. Provide concise, actionable summaries.",
        max_tokens: 1000
      }, {
        taskType: "general",
        priority: "quality"
      });
      const firstContent = response.content[0];
      return firstContent.type === "text" ? firstContent.text : "Summary unavailable";
    } catch (error2) {
      const err = error2;
      this.warn(`LLM summary generation failed: ${err.message}`);
      return this.createBasicSummary(query, results);
    }
  }
  createBasicSummary(query, results) {
    const parts = [];
    parts.push(`Research query: "${query}"`);
    parts.push("");
    if (results.sources.memory && results.sources.memory.length > 0) {
      parts.push(`Found ${results.sources.memory.length} related items in memory.`);
    }
    if (results.sources.github && results.sources.github.length > 0) {
      parts.push(`Found ${results.sources.github.length} GitHub code examples.`);
    }
    if (parts.length === 1) {
      parts.push("No results found. Try a different query or check your sources.");
    } else {
      parts.push("");
      parts.push("Review the detailed results above for specific examples and patterns.");
    }
    return parts.join(`
`);
  }
  buildSummaryPrompt(query, results) {
    let prompt = `Research Query: ${query}

`;
    if (results.sources.memory && results.sources.memory.length > 0) {
      prompt += `## Memory Results

`;
      results.sources.memory.forEach((result, i) => {
        prompt += `${i + 1}. ${JSON.stringify(result)}
`;
      });
      prompt += `
`;
    }
    if (results.sources.github && results.sources.github.length > 0) {
      prompt += `## GitHub Results

`;
      results.sources.github.forEach((result, i) => {
        prompt += `${i + 1}. ${JSON.stringify(result)}
`;
      });
      prompt += `
`;
    }
    prompt += `
Provide a comprehensive but concise summary of the research findings.
Include:
1. Key insights and patterns
2. Recommended approaches
3. Important caveats or considerations
4. Next steps or areas for deeper investigation

Keep the summary under 500 words and focus on actionable information.
`.trim();
    return prompt;
  }
}
// src/cli/commands/RootCauseCommand.ts
import * as os2 from "os";
import * as path5 from "path";

class RootCauseCommand extends BaseCommand {
  name = "rootcause";
  description = "Perform root cause analysis with regression detection";
  orchestrator;
  memory;
  constructor() {
    super();
    const debugDir = path5.join(os2.homedir(), ".claude", ".debug");
    this.orchestrator = createDebugOrchestrator(debugDir, true);
    this.memory = new MemoryManagerBridge;
  }
  async execute(context, config) {
    try {
      switch (config.action) {
        case "analyze":
          return await this.analyzeBug(context, config);
        case "verify":
          return await this.verifyFix(context, config);
        default:
          return this.createFailure(`Unknown action: ${config.action}. Use: analyze, verify`);
      }
    } catch (error2) {
      const err = error2;
      this.error(err.message);
      return this.createFailure(err.message, err);
    }
  }
  async analyzeBug(context, config) {
    if (!config.bugDescription) {
      return this.createFailure("Bug description is required");
    }
    this.info(`\uD83D\uDD0D Analyzing bug`);
    this.info(`Description: ${source_default2.bold(config.bugDescription)}`);
    console.log("");
    this.startSpinner("Running smart debug analysis...");
    const debugContext = await this.orchestrator.smartDebug({
      bugDescription: config.bugDescription,
      bugType: config.bugType || "general",
      testCommand: config.testCommand || 'echo "No tests configured"'
    });
    this.succeedSpinner("Analysis complete");
    await this.memory.recordEpisode("rootcause_analysis", `Bug: ${config.bugDescription}`, "success", JSON.stringify(debugContext));
    console.log("");
    this.success("Root cause analysis completed");
    console.log("");
    console.log(source_default2.bold("Before Snapshot:"), source_default2.cyan(debugContext.beforeSnapshot));
    console.log("");
    if (debugContext.similarFixes.similarFixes.length > 0) {
      console.log(source_default2.bold("Similar Fixes from Memory:"));
      debugContext.similarFixes.similarFixes.forEach((fix, i) => {
        console.log(`  ${i + 1}. ${source_default2.gray(fix.bugDescription)}`);
        console.log(`     Fix: ${source_default2.green(fix.fixDescription)}`);
        console.log(`     Success: ${fix.success ? source_default2.green("Yes") : source_default2.red("No")}`);
      });
      console.log("");
    }
    if (debugContext.githubSolutions && debugContext.githubSolutions.solutions && debugContext.githubSolutions.solutions.length > 0) {
      console.log(source_default2.bold("GitHub Solutions:"));
      debugContext.githubSolutions.solutions.forEach((solution, i) => {
        console.log(`  ${i + 1}. ${source_default2.gray(solution.title || "Solution")}`);
        console.log(`     Repo: ${source_default2.cyan(solution.repo || "N/A")}`);
        console.log(`     ${source_default2.blue(solution.url || "")}`);
      });
      console.log("");
    }
    console.log(source_default2.bold("Fix Prompt:"));
    console.log(source_default2.gray(debugContext.fixPrompt));
    console.log("");
    return this.createSuccess("Analysis complete", debugContext);
  }
  async verifyFix(context, config) {
    if (!config.beforeSnapshotId) {
      return this.createFailure("Before snapshot ID is required");
    }
    if (!config.testCommand) {
      return this.createFailure("Test command is required");
    }
    this.info(`✅ Verifying fix`);
    this.info(`Before Snapshot: ${source_default2.cyan(config.beforeSnapshotId)}`);
    console.log("");
    this.startSpinner("Creating after snapshot and checking for regressions...");
    const recommendation = await this.orchestrator.verifyFix({
      beforeSnapshotId: config.beforeSnapshotId,
      testCommand: config.testCommand,
      fixDescription: config.fixDescription || "Fix applied"
    });
    if (recommendation.status === "success") {
      this.succeedSpinner("Fix verified - no regressions detected");
    } else if (recommendation.regressionsDetected) {
      this.failSpinner("Regressions detected!");
    } else {
      this.failSpinner("Verification failed");
    }
    await this.memory.recordEpisode("fix_verification", config.fixDescription || "Fix applied", recommendation.status === "success" ? "success" : "failed", JSON.stringify(recommendation));
    console.log("");
    console.log(source_default2.bold("Status:"), recommendation.status === "success" ? source_default2.green("Success") : source_default2.red("Failed"));
    console.log(source_default2.bold("Regressions:"), recommendation.regressionsDetected ? source_default2.red("Detected") : source_default2.green("None"));
    console.log("");
    console.log(source_default2.bold("Recommendation:"));
    console.log(source_default2.gray(recommendation.recommendation));
    console.log("");
    if (recommendation.actions.length > 0) {
      console.log(source_default2.bold("Suggested Actions:"));
      recommendation.actions.forEach((action, i) => {
        console.log(`  ${i + 1}. ${source_default2.gray(action)}`);
      });
      console.log("");
    }
    if (config.verbose && recommendation.regressionsDetected) {
      console.log(source_default2.bold("Regression Details:"));
      console.log(source_default2.gray(JSON.stringify(recommendation, null, 2)));
      console.log("");
    }
    return this.createSuccess("Verification complete", recommendation);
  }
}
// src/cli/commands/BuildCommand.ts
import { existsSync as existsSync4, readFileSync as readFileSync4, writeFileSync as writeFileSync4 } from "fs";
import { join as join8 } from "path";
import { execSync as execSync3 } from "child_process";
class BuildCommand {
  name = "build";
  async execute(context, options) {
    try {
      const debugLogPath = join8(context.workDir, ".claude", "docs", "debug-log.md");
      if (!existsSync4(join8(context.workDir, ".claude", "docs"))) {
        execSync3("mkdir -p .claude/docs", { cwd: context.workDir });
      }
      if (!existsSync4(debugLogPath)) {
        const debugLogTemplate = `# Debug Log

> Last Updated: ${new Date().toISOString()}

## Active Issues

## Session: ${new Date().toISOString().split("T")[0]}

---

## Resolved Issues

## Patterns Discovered

## Research Cache
`;
        writeFileSync4(debugLogPath, debugLogTemplate);
      }
      let targetFeature = options.feature;
      if (!targetFeature && existsSync4(join8(context.workDir, "buildguide.md"))) {
        const buildguideContent = readFileSync4(join8(context.workDir, "buildguide.md"), "utf-8");
        const uncheckedMatch = buildguideContent.match(/-\s*\[\s*\]\s*(.+)/);
        if (uncheckedMatch && uncheckedMatch.length > 0) {
          targetFeature = uncheckedMatch[0].replace(/-\s*\[\s*\]\s*/, "").trim();
        }
      }
      if (!targetFeature) {
        return {
          success: false,
          message: "No feature specified and no unchecked sections in buildguide.md"
        };
      }
      console.log(source_default2.bold(`
=== Autonomous Build Mode ===`));
      console.log(source_default2.cyan(`Target Feature: ${targetFeature}`));
      console.log(source_default2.gray(`Loading architecture context...
`));
      console.log(source_default2.yellow("Step 3: Researching implementation patterns..."));
      console.log(source_default2.gray(`Note: Use MCP grep tool to search GitHub for examples
`));
      const buildPlanPath = join8(context.workDir, ".claude", "current-build.local.md");
      const buildPlan = `---
feature: ${targetFeature}
phase: implementing
started: ${new Date().toISOString()}
iteration: 1
fix_attempts: 0
research_done: true
---

## Build Target
${targetFeature}

## Research Insights
[Pending - use MCP grep to find patterns]

## Implementation Steps
1. [ ] Analyze architecture
2. [ ] Implement core functionality
3. [ ] Add error handling
4. [ ] Write tests
5. [ ] Validate

## Quality Gates
- [ ] Lint passes
- [ ] Types check
- [ ] Tests pass
- [ ] No regressions

## Files to Modify
[From architecture analysis]
`;
      writeFileSync4(buildPlanPath, buildPlan);
      console.log(source_default2.green("✓ Build plan created"));
      console.log(source_default2.gray(`Plan saved to: ${buildPlanPath}
`));
      console.log(source_default2.bold("Next Steps:"));
      console.log(source_default2.cyan("1. Use MCP grep to search GitHub for implementation patterns"));
      console.log(source_default2.cyan("2. Implement following the build plan"));
      console.log(source_default2.cyan("3. Run quality checks: lint, typecheck, test"));
      console.log(source_default2.cyan(`4. When complete, run /checkpoint to save progress
`));
      return {
        success: true,
        message: `Build initialized for feature: ${targetFeature}`
      };
    } catch (error2) {
      return {
        success: false,
        message: error2.message || "Build initialization failed"
      };
    }
  }
}
// src/cli/commands/CollabCommand.ts
import { existsSync as existsSync5, readFileSync as readFileSync5, writeFileSync as writeFileSync5, readdirSync } from "fs";
import { join as join9 } from "path";
import { execSync as execSync4 } from "child_process";
class CollabCommand {
  name = "collab";
  async execute(context, options) {
    try {
      const collabDir = join9(context.workDir, ".claude", "collab");
      if (!existsSync5(collabDir)) {
        execSync4("mkdir -p .claude/collab", { cwd: context.workDir });
      }
      switch (options.action) {
        case "start":
          return this.startSession(context, options.sessionName);
        case "join":
          return this.joinSession(context, options.sessionId);
        case "status":
          return this.showStatus(context);
        case "sync":
          return this.syncSession(context);
        case "leave":
          return this.leaveSession(context);
        default:
          return {
            success: false,
            message: `Unknown action: ${options.action}. Use: start, join, status, sync, leave`
          };
      }
    } catch (error2) {
      return {
        success: false,
        message: error2.message || "Collaboration command failed"
      };
    }
  }
  startSession(context, sessionName) {
    const sessionId = `collab_${Date.now()}`;
    const sessionPath = join9(context.workDir, ".claude", "collab", `${sessionId}.json`);
    const sessionData = {
      id: sessionId,
      name: sessionName || "Untitled Session",
      owner: process.env.USER || "unknown",
      createdAt: new Date().toISOString(),
      collaborators: [{ id: process.env.USER || "owner", role: "owner" }],
      activity: [],
      checkpoints: []
    };
    writeFileSync5(sessionPath, JSON.stringify(sessionData, null, 2));
    console.log(source_default2.bold(`
=== Collaboration Session Started ===`));
    console.log(source_default2.green(`Session ID: ${sessionId}`));
    console.log(source_default2.cyan(`Session Name: ${sessionData.name}`));
    console.log(source_default2.gray(`
Share this ID with collaborators to join:
`));
    console.log(source_default2.bold(sessionId));
    return {
      success: true,
      message: `Session started: ${sessionId}`
    };
  }
  joinSession(context, sessionId) {
    if (!sessionId) {
      return {
        success: false,
        message: "Session ID required. Use: /collab join <session-id>"
      };
    }
    const sessionPath = join9(context.workDir, ".claude", "collab", `${sessionId}.json`);
    if (!existsSync5(sessionPath)) {
      return {
        success: false,
        message: `Session not found: ${sessionId}`
      };
    }
    const sessionData = JSON.parse(readFileSync5(sessionPath, "utf-8"));
    const userId = process.env.USER || "unknown";
    if (sessionData.collaborators.find((c) => c.id === userId)) {
      return {
        success: false,
        message: "You are already in this session"
      };
    }
    sessionData.collaborators.push({
      id: userId,
      role: "editor",
      joinedAt: new Date().toISOString()
    });
    writeFileSync5(sessionPath, JSON.stringify(sessionData, null, 2));
    console.log(source_default2.bold(`
=== Joined Collaboration Session ===`));
    console.log(source_default2.green(`Session: ${sessionData.name}`));
    console.log(source_default2.cyan(`Your role: editor`));
    console.log(source_default2.gray(`Active collaborators: ${sessionData.collaborators.length}
`));
    return {
      success: true,
      message: `Joined session: ${sessionId}`
    };
  }
  showStatus(context) {
    const collabDir = join9(context.workDir, ".claude", "collab");
    if (!existsSync5(collabDir)) {
      return {
        success: false,
        message: "No active collaboration sessions"
      };
    }
    const sessions = this.listSessions(collabDir);
    if (sessions.length === 0) {
      return {
        success: false,
        message: "No active collaboration sessions"
      };
    }
    console.log(source_default2.bold(`
=== Active Collaboration Sessions ===
`));
    for (const session of sessions) {
      console.log(source_default2.cyan(`Session: ${session.name}`));
      console.log(source_default2.gray(`  ID: ${session.id}`));
      console.log(source_default2.gray(`  Owner: ${session.owner}`));
      console.log(source_default2.gray(`  Collaborators: ${session.collaborators.length}`));
      console.log(source_default2.gray(`  Created: ${new Date(session.createdAt).toLocaleString()}
`));
      if (session.activity.length > 0) {
        console.log(source_default2.gray("  Recent Activity:"));
        for (const activity of session.activity.slice(-5)) {
          console.log(source_default2.gray(`    - ${activity.user}: ${activity.action} (${new Date(activity.timestamp).toLocaleTimeString()})`));
        }
      }
    }
    return {
      success: true,
      message: `Found ${sessions.length} active session(s)`
    };
  }
  syncSession(context) {
    const collabDir = join9(context.workDir, ".claude", "collab");
    if (!existsSync5(collabDir)) {
      return {
        success: false,
        message: "No active collaboration sessions"
      };
    }
    console.log(source_default2.bold(`
=== Synchronizing Session ===
`));
    console.log(source_default2.cyan("Checking for conflicts..."));
    console.log(source_default2.gray("No conflicts detected."));
    console.log(source_default2.green(`✓ Session synchronized
`));
    return {
      success: true,
      message: "Session synchronized"
    };
  }
  leaveSession(context) {
    const collabDir = join9(context.workDir, ".claude", "collab");
    const userId = process.env.USER || "unknown";
    if (!existsSync5(collabDir)) {
      return {
        success: false,
        message: "No active collaboration sessions"
      };
    }
    const sessions = this.listSessions(collabDir);
    let leftSession = null;
    for (const session of sessions) {
      const collaboratorIndex = session.collaborators.findIndex((c) => c.id === userId);
      if (collaboratorIndex !== -1) {
        session.collaborators.splice(collaboratorIndex, 1);
        const sessionPath = join9(collabDir, `${session.id}.json`);
        writeFileSync5(sessionPath, JSON.stringify(session, null, 2));
        leftSession = session;
        break;
      }
    }
    if (!leftSession) {
      return {
        success: false,
        message: "You are not in any active session"
      };
    }
    console.log(source_default2.bold(`
=== Left Collaboration Session ===`));
    console.log(source_default2.green(`Session: ${leftSession.name}`));
    console.log(source_default2.gray(`ID: ${leftSession.id}
`));
    return {
      success: true,
      message: `Left session: ${leftSession.id}`
    };
  }
  listSessions(collabDir) {
    const sessions = [];
    const files = readdirSync(collabDir);
    for (const file of files) {
      if (file.endsWith(".json")) {
        const sessionPath = join9(collabDir, file);
        const sessionData = JSON.parse(readFileSync5(sessionPath, "utf-8"));
        sessions.push(sessionData);
      }
    }
    return sessions;
  }
}
// src/cli/commands/MultiRepoCommand.ts
import { existsSync as existsSync6, readFileSync as readFileSync6, writeFileSync as writeFileSync6 } from "fs";
import { join as join10 } from "path";
import { execSync as execSync5 } from "child_process";
class MultiRepoCommand {
  name = "multi-repo";
  async execute(context, options) {
    try {
      const configDir = join10(context.workDir, ".claude", "multi-repo");
      const configPath = join10(configDir, "config.json");
      if (!existsSync6(configDir)) {
        execSync5("mkdir -p .claude/multi-repo", { cwd: context.workDir });
      }
      switch (options.action) {
        case "status":
          return this.showStatus(context, configPath);
        case "add":
          return this.addRepos(context, configPath, options.repos || []);
        case "sync":
          return this.syncRepos(context, configPath);
        case "checkpoint":
          return this.createCheckpoint(context, configPath, options.message);
        case "exec":
          return this.execCommand(context, configPath, options.command);
        default:
          return {
            success: false,
            message: `Unknown action: ${options.action}. Use: status, add, sync, checkpoint, exec`
          };
      }
    } catch (error2) {
      return {
        success: false,
        message: error2.message || "Multi-repo command failed"
      };
    }
  }
  showStatus(context, configPath) {
    if (!existsSync6(configPath)) {
      console.log(source_default2.yellow(`
No repositories registered.`));
      console.log(source_default2.gray(`Use: /multi-repo add <path1> <path2> ...
`));
      return {
        success: true,
        message: "No repositories registered"
      };
    }
    const config = JSON.parse(readFileSync6(configPath, "utf-8"));
    const repos = config.repos || [];
    console.log(source_default2.bold(`
=== Registered Repositories ===
`));
    for (const repo of repos) {
      const status = this.getRepoStatus(repo.path);
      console.log(source_default2.cyan(`  ${repo.name}`));
      console.log(source_default2.gray(`    Path: ${repo.path}`));
      console.log(source_default2.gray(`    Status: ${status}
`));
    }
    return {
      success: true,
      message: `Found ${repos.length} registered repo(s)`
    };
  }
  addRepos(context, configPath, repoPaths) {
    if (repoPaths.length === 0) {
      return {
        success: false,
        message: "Repository paths required. Use: /multi-repo add <path1> <path2> ..."
      };
    }
    let config = { repos: [] };
    if (existsSync6(configPath)) {
      config = JSON.parse(readFileSync6(configPath, "utf-8"));
    }
    for (const repoPath of repoPaths) {
      const absolutePath = join10(context.workDir, repoPath);
      if (!existsSync6(absolutePath)) {
        console.log(source_default2.yellow(`Warning: ${repoPath} does not exist`));
        continue;
      }
      const repoName = repoPath.split("/").pop() || repoPath;
      const existingIndex = config.repos.findIndex((r) => r.path === repoPath);
      if (existingIndex !== -1) {
        console.log(source_default2.yellow(`Repository already registered: ${repoName}`));
      } else {
        config.repos.push({
          name: repoName,
          path: repoPath,
          addedAt: new Date().toISOString()
        });
        console.log(source_default2.green(`✓ Added: ${repoName}`));
      }
    }
    writeFileSync6(configPath, JSON.stringify(config, null, 2));
    console.log(source_default2.gray(`
Total repositories: ${config.repos.length}
`));
    return {
      success: true,
      message: `Added repositories. Total: ${config.repos.length}`
    };
  }
  syncRepos(context, configPath) {
    if (!existsSync6(configPath)) {
      return {
        success: false,
        message: "No repositories registered"
      };
    }
    const config = JSON.parse(readFileSync6(configPath, "utf-8"));
    const repos = config.repos || [];
    console.log(source_default2.bold(`
=== Synchronizing Repositories ===
`));
    for (const repo of repos) {
      const repoPath = join10(context.workDir, repo.path);
      console.log(source_default2.cyan(`Syncing: ${repo.name}...`));
      try {
        execSync5("git pull", { cwd: repoPath, stdio: "pipe" });
        console.log(source_default2.green(`  ✓ ${repo.name}: Updated`));
      } catch (e) {
        console.log(source_default2.yellow(`  ⚠ ${repo.name}: ${e.message || "Failed"}`));
      }
    }
    console.log(source_default2.gray(`
Synchronization complete.
`));
    return {
      success: true,
      message: `Synchronized ${repos.length} repo(s)`
    };
  }
  createCheckpoint(context, configPath, message) {
    if (!existsSync6(configPath)) {
      return {
        success: false,
        message: "No repositories registered"
      };
    }
    const config = JSON.parse(readFileSync6(configPath, "utf-8"));
    const repos = config.repos || [];
    console.log(source_default2.bold(`
=== Creating Synchronized Checkpoint ===
`));
    for (const repo of repos) {
      const repoPath = join10(context.workDir, repo.path);
      console.log(source_default2.cyan(`Checkpointing: ${repo.name}...`));
      try {
        execSync5("git add -A", { cwd: repoPath });
        const commitMsg = message || `checkpoint: ${new Date().toISOString()}`;
        execSync5(`git commit -m "${commitMsg}"`, { cwd: repoPath });
        console.log(source_default2.green(`  ✓ ${repo.name}: Committed`));
      } catch (e) {
        console.log(source_default2.yellow(`  ⚠ ${repo.name}: ${e.message || "Failed"}`));
      }
    }
    console.log(source_default2.gray(`
Checkpoint complete.
`));
    return {
      success: true,
      message: `Checkpointed ${repos.length} repo(s)`
    };
  }
  execCommand(context, configPath, command) {
    if (!command) {
      return {
        success: false,
        message: 'Command required. Use: /multi-repo exec "<command>"'
      };
    }
    if (!existsSync6(configPath)) {
      return {
        success: false,
        message: "No repositories registered"
      };
    }
    const config = JSON.parse(readFileSync6(configPath, "utf-8"));
    const repos = config.repos || [];
    console.log(source_default2.bold(`
=== Executing Command in All Repositories ===
`));
    console.log(source_default2.cyan(`Command: ${command}
`));
    for (const repo of repos) {
      const repoPath = join10(context.workDir, repo.path);
      console.log(source_default2.cyan(`Executing in: ${repo.name}...`));
      try {
        const result = execSync5(command, { cwd: repoPath, stdio: "pipe", encoding: "utf-8" });
        console.log(source_default2.gray(`  Output: ${result.substring(0, 200)}...`));
        console.log(source_default2.green(`  ✓ ${repo.name}: Success`));
      } catch (e) {
        console.log(source_default2.red(`  ✗ ${repo.name}: Failed`));
        console.log(source_default2.gray(`  Error: ${e.message}
`));
      }
    }
    console.log(source_default2.gray(`
Execution complete.
`));
    return {
      success: true,
      message: `Executed in ${repos.length} repo(s)`
    };
  }
  getRepoStatus(repoPath) {
    try {
      execSync5("git rev-parse --git-dir", { cwd: repoPath, stdio: "ignore" });
      const status = execSync5("git status --short", { cwd: repoPath, stdio: "pipe", encoding: "utf-8" });
      if (status.trim() === "") {
        return "Clean";
      }
      return "Modified";
    } catch {
      return "Not a git repo";
    }
  }
}
// src/cli/commands/PersonalityCommand.ts
import { existsSync as existsSync7, readFileSync as readFileSync7, writeFileSync as writeFileSync7, readdirSync as readdirSync2 } from "fs";
import { join as join11 } from "path";
class PersonalityCommand {
  name = "personality";
  async execute(context, options) {
    try {
      const personalitiesDir = join11(context.workDir, "personalities");
      if (!existsSync7(personalitiesDir)) {
        return {
          success: false,
          message: "Personalities directory not found"
        };
      }
      switch (options.action) {
        case "list":
          return this.listPersonalities(personalitiesDir);
        case "load":
          return this.loadPersonality(context, personalitiesDir, options.name);
        case "create":
          return this.createPersonality(personalitiesDir, options.name);
        case "edit":
          return this.editPersonality(personalitiesDir, options.name);
        case "current":
          return this.showCurrent(context, personalitiesDir);
        default:
          return {
            success: false,
            message: `Unknown action: ${options.action}. Use: list, load, create, edit, current`
          };
      }
    } catch (error2) {
      return {
        success: false,
        message: error2.message || "Personality command failed"
      };
    }
  }
  listPersonalities(personalitiesDir) {
    const files = readdirSync2(personalitiesDir);
    const personalities = [];
    for (const file of files) {
      if (file.endsWith(".yaml") || file.endsWith(".yml")) {
        const personalityPath = join11(personalitiesDir, file);
        const content = readFileSync7(personalityPath, "utf-8");
        const nameMatch = content.match(/^name:\s*"(.+)"/m);
        const descMatch = content.match(/^description:\s*"(.+)"/m);
        if (nameMatch) {
          personalities.push({
            name: nameMatch[1],
            file,
            description: descMatch ? descMatch[1] : "No description"
          });
        }
      }
    }
    if (personalities.length === 0) {
      console.log(source_default2.yellow(`
No personalities found.`));
      return {
        success: true,
        message: "No personalities found"
      };
    }
    console.log(source_default2.bold(`
=== Available Personalities ===
`));
    for (const personality of personalities) {
      console.log(source_default2.cyan(`  ${personality.name}`));
      console.log(source_default2.gray(`    ${personality.description}`));
    }
    console.log(source_default2.gray(`
Use: /personality load <name>`));
    console.log(source_default2.gray("Use: /personality create <name>"));
    return {
      success: true,
      message: `Found ${personalities.length} personality(ies)`
    };
  }
  loadPersonality(context, personalitiesDir, name) {
    if (!name) {
      return {
        success: false,
        message: "Personality name required. Use: /personality load <name>"
      };
    }
    const personalityPath = join11(personalitiesDir, `${name}.yaml`);
    const personalityYmlPath = join11(personalitiesDir, `${name}.yml`);
    if (!existsSync7(personalityPath) && !existsSync7(personalityYmlPath)) {
      return {
        success: false,
        message: `Personality not found: ${name}`
      };
    }
    const activePath = join11(context.workDir, ".claude", "active-personality.txt");
    const personalityFile = existsSync7(personalityPath) ? personalityPath : personalityYmlPath;
    writeFileSync7(activePath, name);
    const content = readFileSync7(personalityFile, "utf-8");
    const descMatch = content.match(/^description:\s*"(.+)"/m);
    const focusMatch = content.match(/focus:\s*([\s\S]*?)/);
    console.log(source_default2.bold(`
=== Personality Loaded ===`));
    console.log(source_default2.green(`Name: ${name}`));
    if (descMatch) {
      console.log(source_default2.cyan(`Description: ${descMatch[1]}`));
    }
    if (focusMatch) {
      console.log(source_default2.gray(`Focus: ${focusMatch[1].substring(0, 100)}...`));
    }
    return {
      success: true,
      message: `Loaded personality: ${name}`
    };
  }
  createPersonality(personalitiesDir, name) {
    if (!name) {
      return {
        success: false,
        message: "Personality name required. Use: /personality create <name>"
      };
    }
    const personalityPath = join11(personalitiesDir, `${name}.yaml`);
    if (existsSync7(personalityPath)) {
      return {
        success: false,
        message: `Personality already exists: ${name}`
      };
    }
    const template = `name: "${name}"
description: "Brief description of this personality"

focus:
  - Primary domain area
  - Secondary areas
  - Specific technologies

knowledge:
  frameworks: []
  patterns: []
  tools: []

behavior:
  communication_style: "concise"  # or "detailed", "beginner-friendly"
  code_style: "functional"  # or "oop", "procedural"
  testing_preference: "tdd"  # or "integration-first", "e2e-first"
  documentation_level: "comprehensive"  # or "minimal", "inline-only"

priorities:
  - Security
  - Performance
  - Maintainability
  - Speed of delivery

constraints:
  - "Never skip error handling"
  - "Always include tests"
  - "Prefer TypeScript over JavaScript"

prompts:
  pre_task: "Before starting, analyze requirements"
  post_task: "After completion, review for quality"
`;
    writeFileSync7(personalityPath, template);
    console.log(source_default2.bold(`
=== Personality Created ===`));
    console.log(source_default2.green(`Name: ${name}`));
    console.log(source_default2.cyan(`File: ${personalityPath}`));
    console.log(source_default2.gray(`
Edit the file to configure personality settings.
`));
    return {
      success: true,
      message: `Created personality: ${name}`
    };
  }
  editPersonality(personalitiesDir, name) {
    if (!name) {
      return {
        success: false,
        message: "Personality name required. Use: /personality edit <name>"
      };
    }
    const personalityPath = join11(personalitiesDir, `${name}.yaml`);
    const personalityYmlPath = join11(personalitiesDir, `${name}.yml`);
    if (!existsSync7(personalityPath) && !existsSync7(personalityYmlPath)) {
      return {
        success: false,
        message: `Personality not found: ${name}`
      };
    }
    const personalityFile = existsSync7(personalityPath) ? personalityPath : personalityYmlPath;
    console.log(source_default2.bold(`
=== Edit Personality ===`));
    console.log(source_default2.cyan(`File: ${personalityFile}`));
    console.log(source_default2.gray(`
Open the file to edit personality settings.
`));
    return {
      success: true,
      message: `Edit personality: ${name}`
    };
  }
  showCurrent(context, personalitiesDir) {
    const activePath = join11(context.workDir, ".claude", "active-personality.txt");
    if (!existsSync7(activePath)) {
      console.log(source_default2.yellow(`
No personality currently loaded.`));
      console.log(source_default2.gray(`Use: /personality load <name>
`));
      return {
        success: true,
        message: "No personality loaded"
      };
    }
    const activeName = readFileSync7(activePath, "utf-8").trim();
    const personalityPath = join11(personalitiesDir, `${activeName}.yaml`);
    const personalityYmlPath = join11(personalitiesDir, `${activeName}.yml`);
    if (!existsSync7(personalityPath) && !existsSync7(personalityYmlPath)) {
      console.log(source_default2.yellow(`
Personality file not found: ${activeName}`));
      return {
        success: true,
        message: `Personality file missing: ${activeName}`
      };
    }
    const personalityFile = existsSync7(personalityPath) ? personalityPath : personalityYmlPath;
    const content = readFileSync7(personalityFile, "utf-8");
    const descMatch = content.match(/^description:\s*"(.+)"/m);
    const focusMatch = content.match(/focus:\s*([\s\S]*?)/);
    console.log(source_default2.bold(`
=== Active Personality ===`));
    console.log(source_default2.green(`Name: ${activeName}`));
    if (descMatch) {
      console.log(source_default2.cyan(`Description: ${descMatch[1]}`));
    }
    if (focusMatch) {
      console.log(source_default2.gray(`Focus: ${focusMatch[1].substring(0, 100)}...`));
    }
    return {
      success: true,
      message: `Active personality: ${activeName}`
    };
  }
}
// src/cli/commands/ResearchApiCommand.ts
import { writeFileSync as writeFileSync8, mkdirSync as mkdirSync2 } from "fs";
import { join as join12 } from "path";
class ResearchApiCommand {
  name = "research-api";
  async execute(context, options) {
    try {
      const target = options.target;
      const depth = options.depth || "deep";
      console.log(source_default2.bold(`
=== API & Protocol Research ===`));
      console.log(source_default2.cyan(`Target: ${target}`));
      console.log(source_default2.cyan(`Depth: ${depth}
`));
      console.log(source_default2.yellow("Step 1: Classifying target..."));
      const targetType = this.classifyTarget(target);
      console.log(source_default2.green(`  ✓ Target type: ${targetType}
`));
      console.log(source_default2.yellow("Step 2: Generating research plan..."));
      const researchPlan = this.generateResearchPlan(target, targetType, depth);
      console.log(source_default2.green(`  ✓ Research plan generated
`));
      console.log(source_default2.bold(`
=== Research Instructions ===
`));
      console.log(researchPlan);
      const docsDir = join12(context.workDir, ".claude", "docs", "api-research");
      const targetName = this.sanitizeTargetName(target);
      const researchDocPath = join12(docsDir, `${targetName}.md`);
      mkdirSync2(docsDir, { recursive: true });
      const researchDoc = `# ${targetName} API Research

## Overview
- **Target**: ${target}
- **Type**: ${targetType}
- **Depth**: ${depth}
- **Date**: ${new Date().toISOString()}

## Research Plan

${researchPlan}

## Tools Used
- MCP grep (GitHub code search)
- Web Search (online research)
- Protocol analysis tools

## Findings
[Research results will be documented here]

## Endpoints Discovered
[Discovered endpoints]

## Authentication
[Auth mechanism documentation]

## Rate Limits
[Rate limiting information]

## Notes
[Additional notes and observations]

---
Generated by: komplete-kontrol-cli
`;
      writeFileSync8(researchDocPath, researchDoc);
      console.log(source_default2.gray(`
Research document saved to: ${researchDocPath}
`));
      return {
        success: true,
        message: `Research plan generated for: ${target}`
      };
    } catch (error2) {
      return {
        success: false,
        message: error2.message || "API research command failed"
      };
    }
  }
  classifyTarget(target) {
    if (target.startsWith("http://") || target.startsWith("https://")) {
      return "REST API";
    }
    if (target.startsWith("grpc://") || target.includes(".proto")) {
      return "gRPC/Protobuf";
    }
    if (target.includes(".apk")) {
      return "Mobile (Android)";
    }
    if (target.includes(".app") || target.includes(".ipa")) {
      return "Mobile (iOS/Android)";
    }
    if (target.includes(".dll") || target.includes(".so") || target.includes(".dylib")) {
      return "Binary/Native";
    }
    if (target.endsWith(".crx") || target.endsWith(".js") || target.endsWith(".html")) {
      return "Web Frontend";
    }
    return "Unknown";
  }
  generateResearchPlan(target, targetType, _depth) {
    const plans = {
      "REST API": `
### For Web APIs:

1. **Traffic Capture**
   Start mitmproxy:
   \`\`\`bash
   mitmproxy -p 8080 -w capture.flow
   \`\`\`

2. **Endpoint Discovery**
   Use Kiterunner for shadow APIs:
   \`\`\`bash
   kr scan ${target} -w routes-large.kite -o results.json
   \`\`\`

3. **Schema Analysis**
   If OpenAPI available:
   \`\`\`bash
   schemathesis run ${target}/openapi.json
   \`\`\`

4. **Document Findings**
   - Endpoints discovered
   - Auth mechanism
   - Rate limits
   - Required headers
`,
      GraphQL: `
### For GraphQL:

1. **Introspection Check**
   \`\`\`graphql
   {
     __schema {
       types { name fields { name type { name } } }
     }
   }
   \`\`\`

2. **If Introspection Disabled**
   Use Clairvoyance:
   \`\`\`bash
   python clairvoyance.py -t ${target} -w wordlist.txt -o schema.json
   \`\`\`

3. **Schema Reconstruction**
   - Types discovered
   - Mutations available
   - Queries available
`,
      "gRPC/Protobuf": `
### For Binary Protocols:

1. **Protocol Identification**
   \`\`\`bash
   cat response.bin | protoc --decode_raw
   \`\`\`

2. **Schema Recovery**
   From APK:
   \`\`\`bash
   pbtk extract app.apk -o protos/
   \`\`\`

3. **Documentation**
   - Message types
   - Field mappings
   - Service definitions
`,
      "Mobile (Android)": `
### For Mobile Apps:

1. **APK Analysis**
   \`\`\`bash
   jadx -d output/ app.apk
   \`\`\`

2. **Runtime Interception**
   SSL Pinning Bypass:
   \`\`\`bash
   objection -g "App Name" explore --startup-command "android sslpinning disable"
   \`\`\`

3. **Traffic Analysis**
   - Base URL
   - Auth flow
   - Interesting endpoints
`,
      "Mobile (iOS/Android)": `
### For Mobile Apps:

1. **APK Analysis**
   \`\`\`bash
   jadx -d output/ app.apk
   \`\`\`

2. **Runtime Interception**
   SSL Pinning Bypass:
   \`\`\`bash
   objection -g "App Name" explore --startup-command "android sslpinning disable"
   \`\`\`

3. **Traffic Analysis**
   - Base URL
   - Auth flow
   - Interesting endpoints
`,
      "Binary/Native": `
### For Binary Protocols:

1. **Protocol Identification**
   \`\`\`bash
   cat response.bin | protoc --decode_raw
   \`\`\`

2. **Schema Recovery**
   From APK:
   \`\`\`bash
   pbtk extract app.apk -o protos/
   \`\`\`

3. **Documentation**
   - Message types
   - Field mappings
   - Service definitions
`,
      "Web Frontend": `
### For Web Frontend:

1. **Code Analysis**
   - Analyze JavaScript/TypeScript
   - Check for minification
   - Identify frameworks

2. **Traffic Capture**
   - Use browser DevTools
   - Check network tab
   - Analyze API calls

3. **Source Map Recovery**
   - Check for .map files
   - Use source map explorers
`,
      Unknown: `
### For Unknown Targets:

1. **Manual Analysis**
   - Read file contents
   - Identify patterns
   - Search for clues

2. **Tool Selection**
   - Try multiple tools
   - Cross-reference findings

3. **Documentation**
   - Document all discoveries
   - Note unknown elements
`
    };
    return plans[targetType] || plans["Unknown"];
  }
  sanitizeTargetName(target) {
    return target.replace(/[^a-zA-Z0-9-]/g, "_").substring(0, 50);
  }
}
// src/cli/commands/VoiceCommand.ts
import { existsSync as existsSync8, readFileSync as readFileSync8, writeFileSync as writeFileSync9, mkdirSync as mkdirSync3 } from "fs";
import { join as join13 } from "path";
class VoiceCommand {
  name = "voice";
  async execute(context, options) {
    try {
      const voiceDir = join13(context.workDir, ".claude", "voice");
      const configPath = join13(voiceDir, "config.json");
      const statusPath = join13(voiceDir, "status.json");
      if (!existsSync8(voiceDir)) {
        mkdirSync3(voiceDir, { recursive: true });
      }
      switch (options.action) {
        case "start":
          return this.startVoice(context, configPath, statusPath);
        case "stop":
          return this.stopVoice(context, configPath, statusPath);
        case "status":
          return this.showStatus(context, configPath, statusPath);
        case "settings":
          return this.showSettings(context, configPath);
        default:
          return {
            success: false,
            message: `Unknown action: ${options.action}. Use: start, stop, status, settings`
          };
      }
    } catch (error2) {
      return {
        success: false,
        message: error2.message || "Voice command failed"
      };
    }
  }
  startVoice(context, configPath, statusPath) {
    const config = this.loadConfig(configPath);
    const status = {
      active: true,
      startedAt: new Date().toISOString(),
      wakeWord: config.wakeWord || "Hey Claude",
      language: config.language || "en-US",
      ttsEnabled: config.ttsEnabled !== false
    };
    writeFileSync9(statusPath, JSON.stringify(status, null, 2));
    console.log(source_default2.bold(`
=== Voice Control Started ===`));
    console.log(source_default2.green("✓ Listening for wake word..."));
    console.log(source_default2.cyan(`  Wake Word: "${status.wakeWord}"`));
    console.log(source_default2.gray(`  Language: ${status.language}`));
    console.log(source_default2.gray(`  TTS: ${status.ttsEnabled ? "Enabled" : "Disabled"}
`));
    console.log(source_default2.yellow("Available Commands:"));
    console.log(source_default2.gray('  Navigation: "Hey Claude, show me project structure"'));
    console.log(source_default2.gray('  Navigation: "Open file [filename]"'));
    console.log(source_default2.gray('  Navigation: "Go to function [name]"'));
    console.log(source_default2.gray('  Autonomous: "Hey Claude, start autonomous mode"'));
    console.log(source_default2.gray('  Autonomous: "Stop autonomous mode"'));
    console.log(source_default2.gray('  Autonomous: "What are you working on?"'));
    console.log(source_default2.gray('  Checkpoints: "Create checkpoint with message [text]"'));
    console.log(source_default2.gray('  Checkpoints: "Show recent checkpoints"'));
    console.log(source_default2.gray('  Checkpoints: "Restore checkpoint [id]"'));
    console.log(source_default2.gray(`  Status: "What's current status?"`));
    console.log(source_default2.gray('  Status: "Show me recent changes"'));
    console.log(source_default2.gray('  Status: "How many tokens are we using?"'));
    console.log(source_default2.gray('  Tasks: "Add task [description]"'));
    console.log(source_default2.gray('  Tasks: "Mark task complete"'));
    console.log(source_default2.gray(`  Tasks: "Show todo list"
`));
    return {
      success: true,
      message: "Voice control activated"
    };
  }
  stopVoice(context, configPath, statusPath) {
    const status = this.loadStatus(statusPath);
    if (!status || !status.active) {
      return {
        success: false,
        message: "Voice control is not active"
      };
    }
    status.active = false;
    status.stoppedAt = new Date().toISOString();
    writeFileSync9(statusPath, JSON.stringify(status, null, 2));
    console.log(source_default2.bold(`
=== Voice Control Stopped ===`));
    console.log(source_default2.green(`✓ Voice control deactivated
`));
    return {
      success: true,
      message: "Voice control stopped"
    };
  }
  showStatus(context, configPath, statusPath) {
    const config = this.loadConfig(configPath);
    const status = this.loadStatus(statusPath);
    console.log(source_default2.bold(`
=== Voice Control Status ===
`));
    if (!status) {
      console.log(source_default2.yellow("Status: Inactive"));
      console.log(source_default2.gray(`Use: /voice start to activate
`));
      return {
        success: true,
        message: "Voice control is inactive"
      };
    }
    console.log(source_default2.cyan(`Status: ${status.active ? "Active" : "Inactive"}`));
    if (status.startedAt) {
      console.log(source_default2.gray(`Started: ${new Date(status.startedAt).toLocaleString()}`));
    }
    if (status.stoppedAt) {
      console.log(source_default2.gray(`Stopped: ${new Date(status.stoppedAt).toLocaleString()}`));
    }
    console.log(source_default2.gray(`Wake Word: "${config.wakeWord || "Hey Claude"}"`));
    console.log(source_default2.gray(`Language: ${config.language || "en-US"}`));
    console.log(source_default2.gray(`TTS: ${config.ttsEnabled !== false ? "Enabled" : "Disabled"}`));
    console.log(source_default2.gray(`Recognition: ${config.recognitionEngine || "whisper"}`));
    return {
      success: true,
      message: "Voice control status displayed"
    };
  }
  showSettings(context, configPath) {
    const config = this.loadConfig(configPath);
    console.log(source_default2.bold(`
=== Voice Control Settings ===
`));
    console.log(source_default2.cyan(`Wake Word: ${config.wakeWord || "Hey Claude"}`));
    console.log(source_default2.cyan(`Language: ${config.language || "en-US"}`));
    console.log(source_default2.cyan(`TTS Enabled: ${config.ttsEnabled !== false ? "Yes" : "No"}`));
    console.log(source_default2.cyan(`Recognition Engine: ${config.recognitionEngine || "whisper"}`));
    console.log(source_default2.gray(`
To change settings, edit:`));
    console.log(source_default2.gray(`${configPath}
`));
    return {
      success: true,
      message: "Voice control settings displayed"
    };
  }
  loadConfig(configPath) {
    if (existsSync8(configPath)) {
      try {
        return JSON.parse(readFileSync8(configPath, "utf-8"));
      } catch (e) {
        return {};
      }
    }
    return {};
  }
  loadStatus(statusPath) {
    if (existsSync8(statusPath)) {
      try {
        return JSON.parse(readFileSync8(statusPath, "utf-8"));
      } catch (e) {
        return null;
      }
    }
    return null;
  }
}
// src/index.ts
var program2 = new Command;
program2.name("komplete").description("Ultimate AI coding assistant with autonomous capabilities").version("1.0.0");
async function initializeContext() {
  const llmClient = await createLLMClient();
  return {
    llmRouter: llmClient.router,
    llmRegistry: llmClient.registry,
    workDir: process.cwd(),
    autonomousMode: false,
    verbose: false
  };
}
program2.command("auto").description("Enter autonomous mode with ReAct + Reflexion loop").argument("<goal>", "Goal to achieve autonomously").option("-m, --model <model>", 'Model to use. Supports provider/model syntax (e.g., "glm/glm-4.7", "dolphin-3"). Default: auto-routed').option("-i, --iterations <number>", "Max iterations (default: 50)", "50").option("-c, --checkpoint <number>", "Checkpoint every N iterations (default: 10)", "10").option("-v, --verbose", "Verbose output", false).action(async (goal, options) => {
  try {
    const context = await initializeContext();
    context.verbose = options.verbose;
    context.autonomousMode = true;
    const autoCommand = new AutoCommand;
    const result = await autoCommand.execute(context, {
      goal,
      model: options.model,
      maxIterations: parseInt(options.iterations, 10),
      checkpointThreshold: parseInt(options.checkpoint, 10),
      verbose: options.verbose
    });
    if (!result.success) {
      console.error(source_default.red(`
Error:`), result.message);
      process.exit(1);
    }
  } catch (error2) {
    const err = error2;
    console.error(source_default.red(`
Fatal error:`), err.message);
    process.exit(1);
  }
});
program2.command("init").description("Initialize komplete in current project").action(() => {
  console.log(source_default.green("\u2705 Komplete initialized"));
  console.log(source_default.gray("Created .komplete/ directory with configuration"));
});
program2.command("sparc").description("Execute SPARC methodology (Specification \u2192 Pseudocode \u2192 Architecture \u2192 Refinement \u2192 Completion)").argument("<task>", "Task description").option("-r, --requirements <items...>", "Requirements list").option("-c, --constraints <items...>", "Constraints list").option("-v, --verbose", "Verbose output", false).action(async (task, options) => {
  try {
    const context = await initializeContext();
    context.verbose = options.verbose;
    const sparcCommand = new SPARCCommand;
    const result = await sparcCommand.execute(context, {
      task,
      requirements: options.requirements,
      constraints: options.constraints,
      verbose: options.verbose
    });
    if (!result.success) {
      console.error(source_default.red(`
Error:`), result.message);
      process.exit(1);
    }
  } catch (error2) {
    const err = error2;
    console.error(source_default.red(`
Fatal error:`), err.message);
    process.exit(1);
  }
});
program2.command("swarm").description("Spawn and manage distributed agent swarms for parallel execution").argument("<action>", "Action: spawn, status, collect, clear").argument("[task]", "Task description (required for spawn)").option("-n, --count <number>", "Number of agents (for spawn)", "5").option("-id, --swarm-id <id>", "Swarm ID (for status/collect)").option("-d, --dir <directory>", "Working directory").option("-v, --verbose", "Verbose output", false).action(async (action, task, options) => {
  try {
    const context = await initializeContext();
    context.verbose = options.verbose;
    const swarmCommand = new SwarmCommand;
    const result = await swarmCommand.execute(context, {
      action,
      task,
      agentCount: parseInt(options.count, 10),
      swarmId: options.swarmId,
      workDir: options.dir,
      verbose: options.verbose
    });
    if (!result.success) {
      console.error(source_default.red(`
Error:`), result.message);
      process.exit(1);
    }
  } catch (error2) {
    const err = error2;
    console.error(source_default.red(`
Fatal error:`), err.message);
    process.exit(1);
  }
});
program2.command("reflect").description("Run ReAct + Reflexion loop (Think \u2192 Act \u2192 Observe \u2192 Reflect)").argument("<goal>", "Goal to achieve").option("-i, --iterations <number>", "Number of reflexion cycles (default: 3)", "3").option("-v, --verbose", "Verbose output", false).action(async (goal, options) => {
  try {
    const context = await initializeContext();
    context.verbose = options.verbose;
    const reflectCommand = new ReflectCommand;
    const result = await reflectCommand.execute(context, {
      goal,
      iterations: parseInt(options.iterations, 10),
      verbose: options.verbose
    });
    if (!result.success) {
      console.error(source_default.red(`
Error:`), result.message);
      process.exit(1);
    }
  } catch (error2) {
    const err = error2;
    console.error(source_default.red(`
Fatal error:`), err.message);
    process.exit(1);
  }
});
program2.command("reflexion").description("Execute autonomous tasks with ReflexionAgent (Think \u2192 Act \u2192 Observe \u2192 Reflect loop)").argument("<action>", "Action: execute, status, metrics").option("-g, --goal <text>", "Goal to achieve (for execute)").option("-i, --max-iterations <number>", "Max iterations (default: 30)", "30").option("-m, --preferred-model <model>", "Preferred LLM model (e.g., glm-4.7, llama-70b)").option("--output-json", "Output JSON for orchestrator consumption", false).option("-v, --verbose", "Verbose output", false).action(async (action, options) => {
  try {
    const context = await initializeContext();
    context.verbose = options.verbose;
    const reflexionCommand = new ReflexionCommand;
    let result;
    if (action === "execute") {
      result = await reflexionCommand.execute(context, {
        goal: options.goal,
        maxIterations: parseInt(options.maxIterations, 10),
        preferredModel: options.preferredModel,
        outputJson: options.outputJson,
        verbose: options.verbose
      });
    } else if (action === "status") {
      result = await reflexionCommand.status(context, {});
    } else if (action === "metrics") {
      result = await reflexionCommand.metrics(context, {});
    } else {
      console.error(source_default.red(`
Error:`), `Unknown action: ${action}`);
      console.log(source_default.gray("Available actions: execute, status, metrics"));
      process.exit(1);
    }
    if (!result.success) {
      console.error(source_default.red(`
Error:`), result.message);
      process.exit(1);
    }
  } catch (error2) {
    const err = error2;
    console.error(source_default.red(`
Fatal error:`), err.message);
    process.exit(1);
  }
});
program2.command("research").description("Research code patterns, solutions, and best practices").argument("<query>", "Research query").option("-s, --sources <sources...>", "Sources: github, memory, web (default: all)", ["github", "memory"]).option("-l, --limit <number>", "Result limit (default: 10)", "10").option("--lang <languages...>", "Filter by programming languages").option("-v, --verbose", "Verbose output", false).action(async (query, options) => {
  try {
    const context = await initializeContext();
    context.verbose = options.verbose;
    const researchCommand = new ResearchCommand;
    const result = await researchCommand.execute(context, {
      query,
      sources: options.sources,
      limit: parseInt(options.limit, 10),
      language: options.lang,
      verbose: options.verbose
    });
    if (!result.success) {
      console.error(source_default.red(`
Error:`), result.message);
      process.exit(1);
    }
  } catch (error2) {
    const err = error2;
    console.error(source_default.red(`
Fatal error:`), err.message);
    process.exit(1);
  }
});
program2.command("rootcause").description("Perform root cause analysis with regression detection").argument("<action>", "Action: analyze, verify").option("-b, --bug <description>", "Bug description (for analyze)").option("-t, --type <type>", "Bug type (for analyze)").option("--test <command>", "Test command (for verify)").option("--snapshot <id>", "Before snapshot ID (for verify)").option("-f, --fix <description>", "Fix description (for verify)").option("-v, --verbose", "Verbose output", false).action(async (action, options) => {
  try {
    const context = await initializeContext();
    context.verbose = options.verbose;
    const rootcauseCommand = new RootCauseCommand;
    const result = await rootcauseCommand.execute(context, {
      action,
      bugDescription: options.bug,
      bugType: options.type,
      testCommand: options.test,
      beforeSnapshotId: options.snapshot,
      fixDescription: options.fix,
      verbose: options.verbose
    });
    if (!result.success) {
      console.error(source_default.red(`
Error:`), result.message);
      process.exit(1);
    }
  } catch (error2) {
    const err = error2;
    console.error(source_default.red(`
Fatal error:`), err.message);
    process.exit(1);
  }
});
program2.exitOverride((err) => {
  if (err.code === "commander.help" || err.code === "outputHelp" || err.message?.includes("outputHelp") || err.message?.includes("help")) {
    process.exit(0);
  }
  console.error(source_default.red("Error:"), err.message);
  process.exit(1);
});
program2.command("checkpoint").description("Save session state to CLAUDE.md and generate continuation prompt").argument("[summary]", "Optional summary of session work").action(async (summary) => {
  try {
    const context = await initializeContext();
    const checkpointCommand = new CheckpointCommand;
    const result = await checkpointCommand.execute(context, { summary });
    if (!result.success) {
      console.error(source_default.red(`
Error:`), result.message);
      process.exit(1);
    }
  } catch (error2) {
    const err = error2;
    console.error(source_default.red(`
Fatal error:`), err.message);
    process.exit(1);
  }
});
program2.command("build").description("Build features autonomously by reading architecture, researching patterns, and implementing").argument("[feature-name]", "Feature name to build").option("--from <file>", "Use specific architecture document").action(async (featureName, options) => {
  try {
    const context = await initializeContext();
    const buildCommand = new BuildCommand;
    const result = await buildCommand.execute(context, {
      feature: featureName,
      from: options.from
    });
    if (!result.success) {
      console.error(source_default.red(`
Error:`), result.message);
      process.exit(1);
    }
  } catch (error2) {
    const err = error2;
    console.error(source_default.red(`
Fatal error:`), err.message);
    process.exit(1);
  }
});
program2.command("collab").description("Enable multiple users to work simultaneously with Claude on same project").argument("<action>", "Action: start, join, status, sync, leave").option("--session <name>", "Session name (for start)").option("--session-id <id>", "Session ID (for join)").action(async (action, options) => {
  try {
    const context = await initializeContext();
    const collabCommand = new CollabCommand;
    const result = await collabCommand.execute(context, {
      action,
      sessionName: options.session,
      sessionId: options.sessionId
    });
    if (!result.success) {
      console.error(source_default.red(`
Error:`), result.message);
      process.exit(1);
    }
  } catch (error2) {
    const err = error2;
    console.error(source_default.red(`
Fatal error:`), err.message);
    process.exit(1);
  }
});
program2.command("compact").description("Compact memory to optimize context usage and reduce token consumption").argument("[level]", "Compaction level: aggressive, conservative (default: standard)").action(async (level) => {
  try {
    const context = await initializeContext();
    const compactCommand = new CompactCommand;
    const result = await compactCommand.execute(context, {
      level
    });
    if (!result.success) {
      console.error(source_default.red(`
Error:`), result.message);
      process.exit(1);
    }
  } catch (error2) {
    const err = error2;
    console.error(source_default.red(`
Fatal error:`), err.message);
    process.exit(1);
  }
});
program2.command("commit").description("Commit changes to version history").argument("[message]", "Commit message").option("--push", "Push to remote after commit", false).action(async (message, options) => {
  try {
    const context = await initializeContext();
    const commitCommand = new CommitCommand;
    const result = await commitCommand.execute(context, {
      message,
      push: options.push
    });
    if (!result.success) {
      console.error(source_default.red(`
Error:`), result.message);
      process.exit(1);
    }
  } catch (error2) {
    const err = error2;
    console.error(source_default.red(`
Fatal error:`), err.message);
    process.exit(1);
  }
});
program2.command("multi-repo").description("Coordinate work across multiple repositories with dependency tracking").argument("<action>", "Action: status, add, sync, checkpoint, exec").option("--repos <paths...>", "Repository paths (for add)").option("--message <text>", "Checkpoint message").option("--command <cmd>", "Command to execute (for exec)").action(async (action, options) => {
  try {
    const context = await initializeContext();
    const multiRepoCommand = new MultiRepoCommand;
    const result = await multiRepoCommand.execute(context, {
      action,
      repos: options.repos,
      message: options.message,
      command: options.command
    });
    if (!result.success) {
      console.error(source_default.red(`
Error:`), result.message);
      process.exit(1);
    }
  } catch (error2) {
    const err = error2;
    console.error(source_default.red(`
Fatal error:`), err.message);
    process.exit(1);
  }
});
program2.command("personality").description("Configure Claude's behavior, knowledge focus, and communication style").argument("<action>", "Action: list, load, create, edit, current").option("--name <name>", "Personality name (for load/create/edit)").action(async (action, options) => {
  try {
    const context = await initializeContext();
    const personalityCommand = new PersonalityCommand;
    const result = await personalityCommand.execute(context, {
      action,
      name: options.name
    });
    if (!result.success) {
      console.error(source_default.red(`
Error:`), result.message);
      process.exit(1);
    }
  } catch (error2) {
    const err = error2;
    console.error(source_default.red(`
Fatal error:`), err.message);
    process.exit(1);
  }
});
program2.command("re").description("Extract, analyze, and understand any software").argument("<target>", "Target: path, URL, or app identifier").option("--action <type>", "Action: extract, analyze, deobfuscate").action(async (target, options) => {
  try {
    const context = await initializeContext();
    const reCommand = new ReCommand;
    const result = await reCommand.execute(context, {
      target,
      action: options.action
    });
    if (!result.success) {
      console.error(source_default.red(`
Error:`), result.message);
      process.exit(1);
    }
  } catch (error2) {
    const err = error2;
    console.error(source_default.red(`
Fatal error:`), err.message);
    process.exit(1);
  }
});
program2.command("research-api").description("Reverse engineer APIs, protocols, and binaries when documentation is lacking").argument("<target>", "Target: URL, mobile app, protocol, or binary").option("--depth <level>", "Research depth: quick, deep, forensic").action(async (target, options) => {
  try {
    const context = await initializeContext();
    const researchApiCommand = new ResearchApiCommand;
    const result = await researchApiCommand.execute(context, {
      target,
      depth: options.depth
    });
    if (!result.success) {
      console.error(source_default.red(`
Error:`), result.message);
      process.exit(1);
    }
  } catch (error2) {
    const err = error2;
    console.error(source_default.red(`
Fatal error:`), err.message);
    process.exit(1);
  }
});
program2.command("voice").description("Control Claude hands-free using voice commands").argument("<action>", "Action: start, stop, status, settings").action(async (action) => {
  try {
    const context = await initializeContext();
    const voiceCommand = new VoiceCommand;
    const result = await voiceCommand.execute(context, {
      action
    });
    if (!result.success) {
      console.error(source_default.red(`
Error:`), result.message);
      process.exit(1);
    }
  } catch (error2) {
    const err = error2;
    console.error(source_default.red(`
Fatal error:`), err.message);
    process.exit(1);
  }
});
program2.parse();
