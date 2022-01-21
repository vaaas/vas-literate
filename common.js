import * as fs from 'fs'
import * as path from 'path'
import * as fpjs from 'fpjs'
for (const [k, v] of Object.entries(fpjs)) globalThis[k] = v

export function* walk_file_directory(root) {
    for (const entry of fs.readdirSync(root)) {
        const pathname = path.join(root, entry)
        const stats = fs.statSync(pathname)
        if (stats.isFile())
            yield { pathname: pathname, mtime: stats.mtime.getTime() }
        else if (stats.isDirectory())
            yield* walk_file_directory(pathname)
    }
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
    const fields = pipe(xs, map(Object.keys), flatten(1), Set.from)

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
