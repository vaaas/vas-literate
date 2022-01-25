import * as fs from 'fs'
import * as path from 'path'
import * as fpjs from 'fpjs'
for (const [k, v] of Object.entries(fpjs)) globalThis[k] = v

export function* walk_file_directory(root) {
    const make_entry = x => ({ pathname: x[0], mtime: x[1].mtime.getTime() })
    const isfile = x => x[1].isFile()
    const isdir = x => x[1].isDirectory()

    const entries = fs.readdirSync(root).map(x => [
        path.join(root, x),
        fs.statSync(path.join(root, x))
    ])

    yield* entries
        .filter(isfile)
        .sort(by(first))
        .map(make_entry)

    for (const x of entries.filter(isdir).sort(by(first)))
        yield* walk_file_directory(x[0])
}

export const code = (lang, file, code) =>
    "```" +
    [lang, file].filter(I).join(' ') +
    "\n" +
    code +
    "\n" +
    "```"

export const h1 = x => '# ' + x
export const h2 = x => '## ' + x
export const h3 = x => '### ' + x
export const h4 = x => '#### ' + x
export const h5 = x => '##### ' + x
export const h6 = x => '###### ' + x

export function table (xs) {
    const fields = pipe(xs, map(Object.keys), flatten(1), N(Set))

    const head = pipe(fields,
        map(tag('th')),
        join(' '),
        tag('tr'),
        tag('thead'))

    const body = pipe(xs,
        map(x => pipe(
            fields,
            map(get),
            map(T(x)),
            map(tag('td')),
            join(' '))),
        map(tag('tr')),
        join('\n'),
        tag('tbody'))

    return pipe([ head, body ], join('\n'), tag('table'))
}

export const tag = t => x => '<' + t + '>' + x + '</' + t + '>'
