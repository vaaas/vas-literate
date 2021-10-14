#!/usr/bin/env node
"use strict"

const fs = require('fs')
const path = require('path')

const first = x => x[0]
const second = x => x[1]

main(...process.argv.slice(2))

function* walk_file_directory(root) {
    for (const entry of fs.readdirSync(root)) {
        const pathname = path.join(root, entry)
        const stats = fs.statSync(pathname)
        if (stats.isFile())
            yield pathname
        else if (stats.isDirectory())
            yield* walk_file_directory(pathname)
    }
}

function cloneKeys(a, b) {
    for (const x of Object.entries(b))
        a[first(x)] = second(x)
    return a
}

function reduce(f, i, xs) {
    let a = i
    for (const x of xs) a = f(a, x)
    return a
}

function* map(f, xs) {
    for (const x of xs) yield f(x)
}

function* block_generator(string) {
    var i = 0
    while (true) {
        const start = string.indexOf('```', i)
        if (start === -1) break
        i = start + 3
        const end = string.indexOf('```', i)
        if (end === -1) break
        i = end + 3
        yield string.slice(start+3, end)
    }
}

function guess_file_name(pathname) {
    return pathname.slice(0, pathname.lastIndexOf('.'))
}

function process_block(x) {
    const first_newline = x.indexOf('\n')
    const first_line = x.slice(0, first_newline).trim()
    const first_line_parts = first_line.split(/\s+/)
    const file_name = first_line_parts.length < 2 ? null : second(first_line_parts)
    const body = x.slice(first_newline).trim()
    return [ file_name, body ]
}

function process_file(pathname, root, dest) {
    return (
        reduce(
            (xs, x) => {
                const k = first(x) ? path.join(dest, first(x)) : guess_file_name(pathname).replace(root, dest)
                if (xs[k] === undefined) xs[k] = []
                xs[k].push(second(x))
                return xs
            }, {},
        map(process_block,
        block_generator(
        fs.readFileSync(pathname, { encoding: 'utf-8' }))))
    )
}

function main(root='literate', dest='src') {
    const files = (
        reduce(
            (files, x) => {
                for (const [k, v] of Object.entries(x))
                    files[k] = v
                return files
            }, {},
        map(x => process_file(x, root, dest),
        walk_file_directory(root)))
    )

    Object.keys(files).map(path.dirname).forEach(x => fs.mkdirSync(x, { recursive: true }))
    Object.entries(files).forEach(([k, v]) => {
        fs.writeFileSync(k, v.join('\n'))
    })
}
