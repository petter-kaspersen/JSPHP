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
    this.functionDeclarations = [];
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

  addAddCalledFunction({ name, value }) {
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
    const lines = this.rawFile.trim().split("\n");

    for (let line of lines) {
      const lineType = this.getLineType(line);

      let props;

      switch (lineType) {
        case "var":
          props = this.getVariableDeclaration(line);

          this.addVariable(props);
          break;

        case "call_func":
          props = this.getCalledFunction(line);

          this.addAddCalledFunction(props);

          break;

        default:
          console.log(`Unknown declaration found: ${line}`);
          break;
      }
    }

    this.AST = {
      ...this.AST,
      currentOffset: this.currentOffset,
      body: [...this.AST.body, ...this.variables, ...this.calledFunctions],
    };

    fs.writeFileSync("ast.json", JSON.stringify(this.AST));
  }

  getLineType(line) {
    if (this.isVariableDeclaration(line)) return "var";
    else if (this.isCallingFunction(line)) return "call_func";

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

  getVariableDeclaration(line) {
    const matches = line.matchAll(/(\$[a-zA-Z0-9_]*)( = )("(.*)";)*/g);

    let name = "";
    let value = "";
    let type = "";

    for (let match of matches) {
      name = match[1].replace("$", "");
      value = match[4];
      type = "string";
    }

    return { name, value, type };
  }

  getCalledFunction(line) {
    const matches = line.matchAll(/([a-zA-Z0-9_]*)\((.*)\);/g);

    let name = "";
    let value = "";

    for (let match of matches) {
      name = match[1];
      value = match[2];
    }

    return { name, value };
  }
}
