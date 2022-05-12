#!/usr/bin/env node
'use strict'

import * as fs from 'fs'
import * as path from 'path'
import { Parser } from 'commonmark'

// helper functions
const print = x => { console.log(x) ; return x }
const T = x => f => f(x)
const by = f => (a,b) => f(a) < f(b) ? -1 : 1
const first = x => x[0]
const guess_file_name = x => x.slice(0, x.lastIndexOf('.'))

const IteratorPrototype = Object.getPrototypeOf(Object.getPrototypeOf([][Symbol.iterator]()))
IteratorPrototype.toArray = function toArray() { return Array.from(this) }

Array.prototype.popduce = function popduce (f, i) {
	while(this.length) i = f(i, this.pop(), this)
	return i
}

Object.prototype.entries = function entries() { return Object.entries(this) }

// string -> Structure(pathname: string, mtime: Integer)
function* walk_file_directory(root) {
	const make_entry = x => ({ pathname: x[0], mtime: x[1].mtime.getTime() })
	const isfile = x => x[1].isFile()
	const isdir = x => x[1].isDirectory()

	const entries = fs.readdirSync(root)
		.map(x => [
			path.join(root, x),
			fs.statSync(path.join(root, x))
		])

	yield* entries
		.filter(isfile)
		.sort(by(x => x[0]))
		.map(make_entry)

	for (const x of entries.filter(isdir).sort(by(first)))
		yield* walk_file_directory(x[0])
}

// string -> Iterable node
function* block_generator(string) {
	const walker = new Parser().parse(string).walker()
	let x
	while ((x = walker.next())) {
		x = x.node
		if (x.type === 'code_block') yield x
	}
}

// node -> Structure(file_name: string, mode: maybe(string), owner: maybe(string), group: maybe(string), body: string)
const process_block = x =>
	x.info
	.trim()
	.split(/\s+/)
	.slice(1)
	.reverse()
	.popduce(
		(r, x, xs) => {
			switch (x) {
				case ':mode': r.mode = xs.pop(); break
				case ':owner': r.owner = xs.pop(); break
				case ':group': r.group = xs.pop(); break
				default: r.file_name = x; break
			}
			return r
		},
		{
			file_name: null,
			mode: null,
			owner: null,
			group: null,
			body: x.literal,
		})

// (string, string, string) -> Structure(mtime: integer, blocks: Array string, mode: maybe(string), group: maybe(string), owner: maybe(string))
const process_file = (file, root, dest) =>
	block_generator(fs.readFileSync(file.pathname, { encoding: 'utf-8' }))
	.toArray()
	.map(process_block)
	.reduce((xs, x) => {
		const k = x.file_name
			? path.join(dest, x.file_name)
			: guess_file_name(file.pathname).replace(root, dest)
		if (xs[k] === undefined)
			xs[k] = { mtime: 0, blocks: [], mode: null, group: null, owner: null, }
		xs[k].blocks.push(x.body)
		xs[k].mtime = Math.max(xs[k].mtime, file.mtime)
		return xs
	}, {})

function main(root='literate', dest='src') {
	const now = Date.now()
	const stats = fs.statSync(root)

	;(stats.isFile()
		? process_file({ pathname: './' + root, mtime: stats.mtime }, '.', dest)
		: walk_file_directory(root)
			.toArray()
			.map(x => process_file(x, root, dest))
			.reduce(
				(a, b) => {
					for (const [k, v] of Object.entries(b)) a[k] = v
					return a
				},
				{}))
		.entries()
		.forEach(([k, v]) => {
			fs.mkdirSync(path.dirname(k), { recursive: true })
			const mtime = (() => {
				try { return fs.statSync(k).mtime.getTime() }
				catch(e) { return 0 }
			})()
			if (mtime < v.mtime) {
				console.error(k, 'was updated, overwriting')
				fs.writeFileSync(k, v.blocks.join('\n'))
			} else console.error(k, 'was not updated, so not writing')
		})

	console.log('Completed in', (Date.now() - now)/1000, 'seconds')
}

main(...process.argv.slice(2))
