'use strict';

const path = require('path');
const fs = require('fs');
const { run } = require('runjs');
const glob = require('glob');
const watch = require('glob-watcher');
const shell = require('shelljs');
const liveServer = require('live-server');
const gfPacker = require('gamefroot-texture-packer');

String.prototype.rsplit = function (sep, maxsplit) {
    var split = this.split(sep);
    return maxsplit ? [split.slice(0, -maxsplit).join(sep)].concat(split.slice(-maxsplit)) : split;
}

let forever = () => new Promise(() => null);

/**
 * Promise-compatible version of glob
 */
function list(pattern) {
    return new Promise((resolve, reject) => {
        glob(pattern, (err, files) => (err) ? reject(err) : resolve(files));
    });
}

/**
 * Asynchronous execution of shell commands
 */
async function exec(command) {
    await run(command, { async: true });
}

/**
 * Build app from typescript sources
 */
async function ts(dist = false) {
    console.log("Building app...");
    await exec(`tsc -p ${dist ? "./tsconfig.dist.json" : "."}`);
}

/**
 * Start watching for typescript changes
 */
async function watch_ts() {
    watch(["./src/**/*.ts", "package.json"], () => ts());
    await forever();
}

/**
 * Build an atlas of images for a given stage
 */
async function atlas(stage) {
    shell.rm('-f', `out/assets/atlas${stage}-*`);

    let files = await list(`data/stage${stage}/image/**/*.{png,jpg}`);

    let opts = {
        name: `out/assets/atlas${stage}`,
        fullpath: true,
        width: 2048,
        height: 2048,
        square: true,
        powerOfTwo: true,
        padding: 2
    };
    await new Promise(resolve => gfPacker(files, opts, resolve));
    let outfiles = await list(`out/assets/atlas${stage}-*.json`);
    return outfiles.map(file => path.basename(file).replace('.json', ''));
}

/**
 * Build a single data pack
 */
async function pack(stage) {
    console.log(`Building pack ${stage}...`);

    let getKey = x => x.replace(/\//g, "-").replace(/\.[a-z0-9]+$/, '');

    let files = await atlas(stage)
    let items = files.map(file => {
        let fname = path.basename(file);
        return {
            type: "atlasJSONHash",
            key: fname,
            atlasURL: `assets/${fname}.json?t=${Date.now()}`,
            textureURL: `assets/${fname}.png`,
            atlasData: null
        }
    });

    files = await list(`data/stage${stage}/sound/**/*.{mp3,wav}`);
    items = items.concat(files.map(file => {
        const [name, ext] = file.rsplit('.');
        const key = getKey(name.replace(`data/stage${stage}/sound/`, ''));
        shell.cp(file, `out/assets/${key}.${ext}`);
        return {
            type: "audio",
            key: key,
            urls: [`assets/${key}.${ext}?t=${Date.now()}`],
            autoDecode: (ext == 'mp3')
        };
    }));

    files = await list(`data/stage${stage}/shader/**/*.glsl`);
    items = items.concat(files.map(file => {
        const [name, ext] = file.rsplit('.');
        const key = getKey(name.replace(`data/stage${stage}/shader/`, ''));
        shell.cp(file, `out/assets/${key}.${ext}`);
        return {
            type: "shader",
            key: key,
            url: `assets/${key}.${ext}?t=${Date.now()}`
        };
    }));

    let packdata = {};
    packdata[`stage${stage}`] = items;
    await new Promise(resolve => fs.writeFile(`out/assets/pack${stage}.json`, JSON.stringify(packdata), 'utf8', resolve));
}

/**
 * Build data packs
 */
async function data() {
    shell.mkdir("-p", "out/assets");
    await Promise.all([1, 2, 3].map(stage => pack(stage)));
}

/**
 * Start watch for data changes
 */
async function watch_data() {
    watch(["./data/**/*.*"], () => data());
    await forever();
}

/**
 * Copy the vendors from node_modules to dist directory
 */
async function vendors() {
    console.log("Copying vendors...");
    shell.rm('-rf', 'out/vendor');
    shell.mkdir('-p', 'out/vendor');
    shell.cp('-R', 'node_modules/phaser/build', 'out/vendor/phaser');
    shell.cp('-R', 'node_modules/parse/dist', 'out/vendor/parse');
    shell.cp('-R', 'node_modules/jasmine-core/lib/jasmine-core', 'out/vendor/jasmine');
}

/**
 * Start watching for vendors changes
 */
async function watch_vendors() {
    watch(['package.json'], () => vendors());
    await forever();
}

/**
 * Trigger a single build
 */
async function build(dist = false) {
    await Promise.all([
        ts(dist),
        data(),
        vendors()
    ]);
}

/**
 * Optimize the build for production
 */
async function optimize() {
    // TODO do not overwrite dev build
    await exec("uglifyjs out/build.dist.js --source-map --output out/build.js");
}

/**
 * Deploy to production
 */
async function deploy(task) {
    await build(true);
    await optimize();
    await exec("rsync -avz --delete ./out/ hosting.thunderk.net:/srv/website/spacetac/");
}

/**
 * Run tests in karma
 */
async function karma() {
    await exec("karma start spec/support/karma.conf.js");
}

/**
 * Run tests in karma (suppose is already built)
 */
async function test(task) {
    await karma();
}

/**
 * Run tests in karma, using freshly built app (for continuous integration)
 */
async function ci(task) {
    await Promise.all([ts(), vendors()]);
    await karma();
    await exec("remap-istanbul -i out/coverage/coverage.json -o out/coverage -t html");
}

/**
 * Serve the app for dev purpose
 */
async function serve() {
    liveServer.start({
        host: '127.0.0.1',
        port: 8012,
        root: 'out',
        ignore: 'coverage',
        wait: 500
    });
    await new Promise(() => null);
}

/**
 * Continuous development server
 */
async function continuous() {
    try {
        await build();
    } catch (err) {
        console.error(err);
    }

    await Promise.all([
        serve(),
        watch_ts(),
        watch_data(),
        watch_vendors()
    ]);
}

/**
 * Wrapper around an async execution function, to make it a runjs command
 */
function command(func) {
    return async function () {
        try {
            await func();
        } catch (err) {
            console.error(err);
            process.exit(1);
        }
    }
}

module.exports = {
    ts: command(ts),
    watch_ts: command(watch_ts),
    data: command(data),
    watch_data: command(watch_data),
    vendors: command(vendors),
    watch_vendors: command(watch_vendors),
    build: command(build),
    test: command(test),
    deploy: command(deploy),
    serve: command(serve),
    continuous: command(continuous),
    ci: command(ci)
}
