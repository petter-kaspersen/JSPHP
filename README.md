# JSPHP

Converts PHP to JS. I have no idea why I created this, I have no idea what I'm gonna do with it, and if
you try to use it I feel sorry for you.

Enjoy.

## How does it work?

First the program evaluates the AST of the PHP file you pass to it. Then,
the program traverses every children of the program,
converting it to JS AST. Then, the program writes to the defined JS outfile.

It will currently skip over any (yet) unsupported syntax.

## Currently supported language features

### Parse variable declarations

The program can parse simple variable declarations of the following types.

- string
- boolean
- number
- float


#### Example:

```php
<?php

$x = 1337;
$y = "1337";
$z = false;
$zz = 0.5;

?>
```

The program wil output the following JS code:

```js
var x = 1337;
var y = "1337";
var z = false;
var zz = 0.5;
```

### Parse simple function calls

The program can parse basic function calls.

Currently supported global functions:

* console.log

#### Example

```php
<?php

print_r("Hello");
var_dump(20);

?>
```

This will output

```js
console.log("Hello");
console.log(20);
```

Every other function will return the same function.

```php
<?php
some_other_func("test");
?>
```

```js
some_other_func("test");
```