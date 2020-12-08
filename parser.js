const fs = require("fs");

class Parser {
  constructor(inFile) {
    this.rawFile = fs.readFileSync(inFile, "utf-8");

    this.AST = {
      type: "Program",
      start: 0,
      end: 0,
      body: [],
    };

    this.currentOffset = 0;

    this.variables = [];
    this.functions = [];
    this.calledFunctions = [];
  }

  addVariable({ name, value, type }) {
    let build = `var ${name} = "${value}";`;

    let identifierLength = this.currentOffset + 4;

    this.variables.push({
      type: "VariableDeclaration",
      start: this.currentOffset,
      end: build.length,
      declarations: [
        {
          type: "VariableDeclarator",
          start: identifierLength,
          end: build.length - 1,
          id: {
            type: "Identifier",
            start: identifierLength,
            end: name.length,
            name: name,
          },
          init: {
            type: "Literal",
            start: name.length + 3,
            end: build.length - 1,
            value: `${value}`,
            raw: `"${value.replace('"', '\\"')}"`,
          },
        },
      ],
      kind: "var",
    });

    this.currentOffset += build.length + 1;
  }

  addCalledFunction({ name, value }) {
    value = value.replace("$", "");
    switch (name) {
      case "echo":
      case "print":
      case "print_r":
        this.consoleLog(value);
        break;

      default:
        break;
    }
  }

  parseFunctionArgs(args) {
    if (args === "") return args;

    const raw = args.split(",");

    return {
      raw: raw.join(","),
      args: args.split(",").map((arg) => {
        const fixedArg = arg.replace("$", "");

        return {
          length: fixedArg.length,
          name: fixedArg,
        };
      }),
    };
  }

  addFunction({ name, args, content }) {
    const fixedArgs = this.parseFunctionArgs(args);

    let build = `function ${name}(${fixedArgs?.raw ?? ""}) {${content}}`;

    const bodyStart =
      this.currentOffset + 12 + name.length + this.parseFunctionArgs(args);

    const bodyEnd = this.currentOffset + build.length;

    let localOffset = 10 + name.length;

    this.functions.push({
      type: "FunctionDeclaration",
      start: this.currentOffset,
      end: build.length,
      id: {
        type: "Identifier",
        start: this.currentOffset + 9,
        end: this.currentOffset + 9 + name.length,
        name: name,
      },
      expression: false,
      generator: false,
      async: false,
      params: fixedArgs?.args
        ? fixedArgs.args.map((arg) => {
            const start = localOffset;
            const end = localOffset + arg.length - 1;

            localOffset += 1;
            return {
              type: "Identifier",
              start: start,
              end: end,
              name: arg.name.trim(),
            };
          })
        : [],
      body: {
        type: "BlockStatement",
        start: bodyStart,
        end: bodyEnd,
      },
    });

    this.currentOffset += build.length + 1;
  }

  consoleLog(value) {
    let build = `console.log(${value});`;

    this.calledFunctions.push({
      type: "ExpressionStatement",
      start: this.currentOffset,
      end: build.length - 1,
      expression: {
        type: "CallExpression",
        start: this.currentOffset,
        end: build.length - 1,
        callee: {
          type: "MemberExpression",
          start: this.currentOffset,
          end: this.currentOffset + 8,
          object: {
            type: "Identifier",
            start: this.currentOffset,
            end: this.currentOffset + 7,
            name: "console",
          },
          property: {
            type: "Identifier",
            start: this.currentOffset + 8,
            end: this.currentOffset + 11,
            name: "log",
          },
          computed: false,
          optional: false,
        },
        arguments: [
          {
            type: "Identifier",
            start: this.currentOffset + 12,
            end: value.length,
            name: value,
          },
        ],
        optional: false,
      },
    });

    this.currentOffset += build.length + 1;
  }

  startParse() {
    let hasMatchedAll = false;

    while (!hasMatchedAll) {
      const lineType = this.getLineType(this.rawFile);

      let props;

      if (this.rawFile.trim() === "") {
        hasMatchedAll = true;
      }

      switch (lineType) {
        case "var":
          props = this.getVariableDeclaration(this.rawFile);

          this.addVariable(props);
          break;

        case "call_func":
          props = this.getCalledFunction(this.rawFile);

          this.addCalledFunction(props);
          break;

        case "func":
          props = this.getFunctionDeclaration(this.rawFile);

          this.addFunction(props);
          break;

        default:
          break;
      }
      if (props?.raw) {
        this.rawFile = this.rawFile.replace(props.raw, "").trim();
      }
    }

    this.AST = {
      ...this.AST,
      currentOffset: this.currentOffset,
      body: [
        ...this.AST.body,
        ...this.variables,
        ...this.calledFunctions,
        ...this.functions,
      ],
    };

    fs.writeFileSync("ast.json", JSON.stringify(this.AST));
  }

  getLineType(line) {
    if (this.isVariableDeclaration(line)) return "var";
    else if (this.isCallingFunction(line)) return "call_func";
    else if (this.isFunctionDeclaration(line)) return "func";

    return "";
  }

  isVariableDeclaration(line) {
    const val = line.match(/(\$[a-zA-Z0-9_]*)( = )("(.*)";)*/g);

    return val && val.length > 0;
  }

  isCallingFunction(line) {
    const val = line.match(/([a-zA-Z0-9_]*)\((.*)\);/);

    return val && val.length > 0;
  }

  isFunctionDeclaration(line) {
    const val = line.match(
      /function ([a-zA-Z0-9_]*)\s?\((.*)\)\s?{([\r\n]+)}/g
    );

    return val && val.length > 0;
  }

  getVariableDeclaration(line) {
    const matches = line.matchAll(/(\$[a-zA-Z0-9_]*)( = )("(.*)";)*/g);

    let name = "";
    let value;
    let type = "";
    let raw;

    for (let match of matches) {
      name = match[1].replace("$", "");
      value = match[4];
      type = typeof value;
      raw = match[0];
    }

    return { name, value, type, raw };
  }

  getFunctionDeclaration(line) {
    const matches = line.matchAll(
      /function ([a-zA-Z0-9_]*)\s?\((.*)\)\s?{([\r\n]+)}/g
    );

    let name;
    let args;
    let raw;
    let content;

    let rest;

    for (let match of matches) {
      [raw, name, args, content, ...rest] = match;
    }

    return { name, args, raw, content };
  }

  getCalledFunction(line) {
    const matches = line.matchAll(/([a-zA-Z0-9_]*)\((.*)\);/g);

    let name = "";
    let value = "";
    let raw = "";

    for (let match of matches) {
      name = match[1];
      value = match[2];
      raw = match[0];
    }

    return { name, value, raw };
  }
}
