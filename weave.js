#!/usr/bin/env node
"use strict"

import * as fs from 'fs'
import * as path from 'path'
import * as commonmark from 'commonmark'
import * as fpjs from 'fpjs'
for (const [k, v] of Object.entries(fpjs)) globalThis[k] = v
import * as common from './common.js'
for (const [k, v] of Object.entries(common)) globalThis[k] = v

function render_markdown(x) {
    const reader = new commonmark.Parser()
    const writer = new commonmark.HtmlRenderer()
    return writer.render(reader.parse(x))
}

const add_boilerplate = x => `<!DOCTYPE html>
<html>
<head>
	<meta charset='utf-8'/>
	<meta name='viewport' content='width=device-width, initial-scale=1.0'/>
	<title>Weave</title>
	<script src='script.js'></script>
	<link rel='stylesheet' href='style.css'/>
	<script src='hljs.js'></script>
</head>
<body>
<main>
${x}
</main>
</body>
</html>`

function* block_generator(x) {
    var i = 0
    while (true) {
        const start = x.indexOf('```', i)
        if (start === -1)
            break
        if (start > 0 && x[start-1] !== '\n')
            continue
        i = start + 3
        const end = x.indexOf('```', i)
        if (end === -1)
            break
        i = end + 3
        yield [start, end+3]
    }
}

const string_blocks = x => function* (ranges) {
    var i = 0
    var beg = 0
    var end = 0
    for (const range of ranges) {
        [beg, end] = range
        if (beg - i > 2) yield x.slice(i, beg)
        yield x.slice(beg, end)
        i = end
    }
    if (end < x.length)
        yield x.slice(end, x.length)
}

const expand_macros = x => pipe(
    x,
    block_generator,
    Array.from,
    string_blocks(x),
    map(maybe_expand),
    join('\n\n'))

function maybe_expand(x) {
    const query = '```javascript /\n'
    if (x.startsWith(query))
        return eval(x.slice(query.length, x.length - 3))
    else
        return x
}

function main(root='literate', dest='weave.html') {
    const now = Date.now()
    pipe(
        walk_file_directory(root),
        map(get('pathname')),
        sort(by(I)),
        map(x => fs.readFileSync(x).toString()),
        map(expand_macros),
        join('\n\n'),
        render_markdown,
        add_boilerplate,
        x => fs.writeFileSync(dest, x))

    console.log('Completed in', (Date.now() - now)/1000, 'seconds')
}

main(...process.argv.slice(2))
