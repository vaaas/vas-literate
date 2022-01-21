#!/usr/bin/env node
"use strict"

import * as fs from 'fs'
import * as path from 'path'
import * as fpjs from 'fpjs'
for (const [k, v] of Object.entries(fpjs)) globalThis[k] = v
import * as common from './common.js'
for (const [k, v] of Object.entries(common)) globalThis[k] = v
import { walk_file_directory } from './common.js'

const guess_file_name = x => x.slice(0, x.lastIndexOf('.'))

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
    if (file_name === '/')
        return pipe(eval(body), block_generator, map(process_block))
    else
        return { file_name, body, mode, owner, group, }
}

const process_file = (file, root, dest) => pipe(
    fs.readFileSync(file.pathname, { encoding: 'utf-8' }),
    block_generator,
    map(process_block),
    flatten_until(B(not)(isIterable)),
    foldl(xs => x => {
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
    })({}))

function main(root='literate', dest='src') {
    const now = Date.now()
    const stats = fs.statSync(root)
    const files = pipe(
        stats.isFile() ?
            [process_file({ pathname: './' + root, mtime: stats.mtime }, '.', dest)] :
            map(x => process_file(x, root, dest))(walk_file_directory(root)),
        foldr(update)({}))

    pipe(Object.keys(files),
        map(path.dirname),
        each(x => fs.mkdirSync(x, { recursive: true })))

    pipe(Object.entries(files),
        each(([k, v]) => pipe(
            attempt(() => fs.statSync(k).mtime.getTime()),
            failure(K(0)),
            ifelse(lt(v.mtime))
                (() => {
                    console.error(k, 'was updated, overwriting')
                    fs.writeFileSync(k, v.blocks.join('\n'))
                },
                () => console.error(k, 'was not updated, so not writing')))),
        each(([k, v]) => { if (v.mode) fs.chmodSync(k, v.mode) }))

    console.log('Completed in', (Date.now() - now)/1000, 'seconds')
}

main(...process.argv.slice(2))
