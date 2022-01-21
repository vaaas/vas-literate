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

function main(root='literate', dest='weave.html') {
    const now = Date.now()
    pipe(
        walk_file_directory(root),
        map(get('pathname')),
        sort(by(I)),
        map(x => fs.readFileSync(x).toString()),
        join('\n\n'),
        render_markdown,
        add_boilerplate,
        x => fs.writeFileSync(dest, x))

    console.log('Completed in', (Date.now() - now)/1000, 'seconds')
}

main(...process.argv.slice(2))
