#!/usr/bin/env node
"use strict"

const fs = require('fs')
const path = require('path')

const second = x => x[1]

main(...process.argv.slice(2))

function* walk_file_directory(root) {
    for (const entry of fs.readdirSync(root)) {
        const pathname = path.join(root, entry)
        const stats = fs.statSync(pathname)
        if (stats.isFile())
            yield { pathname: pathname, mtime: stats.mtime.getTime() }
        else if (stats.isDirectory())
            yield* walk_file_directory(pathname)
    }
}

function cloneKeys(a, b) {
    for (const [k, v] of Object.entries(b)) a[k] = v
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
    let file_name = null
    let mode = null
    let owner = null
    let group = null
    for (let i = 1; i < first_line_parts.length; i++) {
        const x = first_line_parts[i]
        const y = first_line_parts[i+1]
        if (y === undefined) file_name = x
        else if (x === ':mode') {
            mode = y
            i++
        } else if (x === ':owner') {
            owner = y
            i++
        } else if (x === ':group') {
            group = y
            i++
        } else file_name = x
    }
    const body = x.slice(first_newline).trim()
    return { file_name, body, mode, owner, group, }
}

function process_file(file, root, dest) {
    return reduce(
        (xs, x) => {
            const k = x.file_name ?
                path.join(dest, x.file_name) :
                guess_file_name(file.pathname).replace(root, dest)
            if (xs[k] === undefined)
                xs[k] = {
                    mtime: 0,
                    blocks: [],
                    mode: null,
                    group: null,
                    owner: null,
                }
            xs[k].blocks.push(x.body)
            xs[k].mtime = Math.max(xs[k].mtime, file.mtime)
            for (const f of ['mode', 'group', 'owner'])
                xs[k][f] = xs[k][f] || x[f]
            return xs
        }, {},
        map(process_block,
        block_generator(
        fs.readFileSync(file.pathname, { encoding: 'utf-8' }))))
}

function main(root='literate', dest='src') {
    const now = Date.now()

    const stats = fs.statSync(root)
    const files = reduce(
        (files, x) => {
            for (const [k, v] of Object.entries(x))
                files[k] = v
            return files
        }, {},
        stats.isFile() ?
            [process_file({ pathname: './' + root, mtime: stats.mtime }, '.', dest)] :
            map(x => process_file(x, root, dest), walk_file_directory(root)))

    Object.keys(files)
        .map(path.dirname)
        .forEach(x => fs.mkdirSync(x, { recursive: true }))

    Object.entries(files)
        .forEach(([k, v]) => {
            var mtime
            try { mtime = fs.statSync(k).mtime.getTime() }
            catch(e) { mtime = 0 }
            if (v.mtime > mtime) {
                console.error(k, ' was updated, overwriting')
                fs.writeFileSync(k, v.blocks.join('\n'))
            } else
                console.error(k, ' was not updated, so not writing')
            if (v.mode)
                fs.chmodSync(k, v.mode)
        })

    console.log('Completed in', (Date.now() - now)/1000, 'seconds')
}
