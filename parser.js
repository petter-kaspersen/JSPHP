const fs = require("fs");
const php = require("php-parser");
const astring = require("astring");

const phpParser = new php({
  // some options :
  parser: {
    extractDoc: true,
    php7: true,
  },
  ast: {
    withPositions: true,
  },
});

class Parser {
  constructor({ file }) {
    this.rawFile = fs.readFileSync(file, "utf-8");

    this.PHP_AST = phpParser.parseCode(this.rawFile);

    this.JS_AST = {
      type: "Program",
      end: 0,
      start: 0,
      body: [],
    };

    this.currentOffset = 0;

    this.children = [];
  }

  startParse() {
    for (let child of this.PHP_AST.children) {
      switch (child.kind) {
        case "expressionstatement":
          this.addExpressionStatement(child);
          break;
        default:
          console.log(`Found unsupported kind`, child.kind);
          break;
      }
    }
  }

  addExpressionStatement(statement) {
    switch (statement.expression.kind) {
      case "assign":
        this.addAssignStatement(statement);
        break;
      case "call":
        this.addCallStatement(statement);
        break;
    }
  }

  getExpressionValue(val) {
    let value;
    let raw;
    switch (val.kind) {
      case "string":
        value = val.value;
        raw = val.raw;
        break;

      case "number":
        value = `${val.value}`;
        raw = `${val.value}`;
        break;

      case "boolean":
        value = val.value;
        raw = val.value.toString();
        break;

      default:
        break;
    }

    return {
      value,
      raw,
    };
  }

  addAssignStatement(statement) {
    const name = statement.expression.left.name;
    const { value, raw } = this.getExpressionValue(statement.expression.right);

    let body = `var ${name} = ${JSON.stringify(value)};`;

    let start = this.currentOffset;
    let end = this.currentOffset + body.length;

    const toInsert = {
      kind: "var",
      type: "VariableDeclaration",
      start: start,
      end: end,
      declarations: [
        {
          type: "VariableDeclarator",
          start: start + 4,
          end: end - 1,
          id: {
            type: "Identifier",
            start: start + 4,
            end: start + 4 + name.length,
            name: name,
          },
          init: {
            type: "Literal",
            start: start + 7 + name.length,
            end: start + body.length,
            value: value,
            raw: raw,
          },
        },
      ],
    };

    this.JS_AST = {
      ...this.JS_AST,
      end: this.currentOffset + end + 1,
      body: [...this.JS_AST.body, toInsert],
    };
  }

  getCallStatementArguments(args) {
    return args.map((arg) => {
      const toReturn = this.getExpressionValue(arg);
      return toReturn;
    });
  }

  convertPHPStatementNameToJS(name) {
    switch (name) {
      case "print_r":
      case "var_dump":
        return "console.log";

      case "abs":
        return "Math.abs";

      default:
        return name;
    }
  }

  addCallStatement(statement) {
    const name = this.convertPHPStatementNameToJS(
      statement.expression.what.name
    );

    const args = this.getCallStatementArguments(statement.expression.arguments);

    const formattedArgs = args.map((a) => a.raw).join(", ");

    let body = `${name}(${formattedArgs});`;

    let start = this.currentOffset;
    let end = this.currentOffset + body.length;

    const toInsert = {
      type: "ExpressionStatement",
      start: start,
      end: end,
      expression: {
        type: "CallExpression",
        start: start,
        end: body.length - 1,
        callee: {
          type: "MemberExpression",
          start: start,
          end: start + 11,
          type: "Identifier",
          start: start,
          end: start + name.length,
          name: name,
        },
        arguments: args.map((arg) => {
          const toReturn = {
            type: "Literal",
            value: arg.value,
            raw: arg.raw,
          };

          return toReturn;
        }),
      },
    };

    this.JS_AST = {
      ...this.JS_AST,
      end: this.currentOffset + end + 1,
      body: [...this.JS_AST.body, toInsert],
    };
  }

  writeFile(out) {
    fs.writeFileSync(out, astring.generate(this.JS_AST));
  }
}

const p = new Parser({ file: "in.php" });

p.startParse();
p.writeFile("output.js");
