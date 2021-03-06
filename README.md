# vas-literate

Tangler for literate programming in Markdown, in as few lines as possible.

# Usage

```bash
node tangle.js [SOURCE] [DESTINATION]
```

If SOURCE is not provided, `literate` is assumed. If DESTINATION is not provided, `src` is assumed. Literate files, in markdown, are tangled from the source directory into the destination directory.

If the source is a file, the tangler will try to detect markdown code blocks in it. If it is a directory, it will walk through the directory, breadth-first and with alphabetical sort, and try to detect markdown code blocks in every file in the directory.

The first line of a markdown fenced code block is its "info", like so:

	```c
	int main() {
		return 1;
	}
	```

Info arguments are separated by space. The first argument is the language, which the tangler ignores. After specifying the language, a file name can optionally be provided. If no file name is provided, one is automatically generated by stripping `.md` from the literate file's name. Thus, `main.c.md` becomes `main.c`.

The tangled file's directory is the same as the directory of the literate file, but SOURCE is replaced by DESTINATION. Thus, `literate/helpers/util.js.md` is saved into `src/helpers/util.js`.

A literate file can have multiple code blocks and multiple outputs. If the same output file has many code blocks, they are concatenated and joined with a newline character.
