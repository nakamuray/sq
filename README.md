# sq - Stream jQuery

`sq` is a tool to execute coffee script expression including jquery to stdin stream or speciefied URL/file.

## Install

```console
$ npm install
```

## Usage
```
sq  <coffee expression> [URL or filename]
```

## Example

```console
$ echo '<html><body><h1>Hello World!</h1></body><html>' | sq '$("h1").text()'
Hello World!
```

```console
$ sq '$("img").map -> this.src' https://jquery.com/
https://jquery.org/resources/members/famous.png
https://jquery.org/resources/members/mediatemple.png
https://jquery.org/resources/members/wordpress.png
https://jquery.org/resources/members/ibm.png
https://jquery.com/jquery-wp-content/themes/jquery/content/books/learning-jquery-4th-ed.jpg
https://jquery.com/jquery-wp-content/themes/jquery/content/books/jquery-in-action.jpg
https://jquery.com/jquery-wp-content/themes/jquery/content/books/jquery-succinctly.jpg
```
