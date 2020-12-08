# JSPHP

Converts PHP to JS. I have no idea why I created this, I have no idea what I'm gonna do with it, and if
you try to use it I feel sorry for you.

Enjoy.



### Current supported syntax:

#### Variable declaration

Simple variable parsing works.

Eg.

```php
$test = "Hello, world";
```

It currently only supports variables of type string.

#### Simple function calls

Simple function calls works, the only implemented call right now is `print`, `echo` and `print_r` which at the moment all gets parsed to `console.log`.

Example:

```php
$test = "Hello, world!";

echo($print);
```