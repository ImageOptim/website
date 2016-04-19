'use strict';
const gulp         = require('gulp');
const exec         = require('child_process').exec;
const browserSync  = require('browser-sync').create();
const each         = require('gulp-each');
const sass         = require('gulp-sass');
const autoprefixer = require('gulp-autoprefixer');
const cleancss     = require('gulp-clean-css');
const zopfli       = require('gulp-zopfli');
const htmlmin      = require('gulp-htmlmin');
const nunjucks     = require('nunjucks');
const fs           = require('fs');
const yaml         = require('js-yaml');

const defaultProps = yaml.safeLoad(fs.readFileSync('pages/_default.yaml'));
defaultProps.dev = process.argv[2] == 'watch';

gulp.task('watch', ['css-browsersync', 'pages'], function() {
    if (!defaultProps.dev) throw Error("Misconfigured");

    gulp.watch("gulpfile.js").on("change", () => process.exit(0));

    browserSync.init({
        server: "./public"
    });

    gulp.watch("style/*.scss", ['css-browsersync']);
    gulp.watch("pages/*.{html,yaml}", ['pages']);
    gulp.watch("public/*.html").on('change', browserSync.reload);
});

gulp.task('css-browsersync', function() {
    return gulp.src(["style/[a-z]*.scss"])
        .pipe(sass().on('error', function (err) {
            console.error(err.message);
            browserSync.notify(err.message, 3000);
            this.emit('end');
        }))
        .pipe(gulp.dest("public/"))
        .pipe(browserSync.stream());
});

gulp.task('css', function() {
    return gulp.src("style/[a-z]*.scss")
        .pipe(sass())
        .pipe(autoprefixer())
        .pipe(cleancss({
            rebase:false,
        }))
        .pipe(gulp.dest("public/"))
});

gulp.task('compress', ['css', 'pages'], function() {
    return gulp.src(["public/style.css", "public/*.html"])
        .pipe(zopfli())
        .pipe(gulp.dest("public/"))
});

gulp.task('pages', defaultProps.dev ? [] : ['css'], function() {
    let pageStream = gulp.src(["pages/[a-z]*.html"])
        .pipe(each((content, file, callback) => {
            const path = file.history[0];

            const env = nunjucks.configure({
                throwOnUndefined: true,
                trimBlocks: true,
            });

            const propsPath = path.replace(/html$/,'yaml');
            const props = fs.existsSync(propsPath) ? Object.assign({}, defaultProps, yaml.safeLoad(fs.readFileSync(propsPath))) : defaultProps;

            if (!props.dev && props.inlineStyleFile) {
                props.inlineStyle = fs.readFileSync(`public/${props.inlineStyleFile}`);
            }

            const txt = yaml.safeLoad(fs.readFileSync(`pages/_${props.lang}.yaml`));

            env.addFilter('t', t => {
                const translated = txt[t];
                if ('string' === typeof translated) {
                    return translated;
                }
                if (props.lang != 'en') console.error(`Untranslated '${t}'`);
                return t;
            });

            env.renderString(content, props, {path}, (err, res) => {
                if (err) {
                    console.error(err && err.stack || err);
                    return callback(err, ''+err);
                }
                callback(null, ''+res);
            });
        }));
    if (!defaultProps.dev) {
        pageStream = pageStream.pipe(htmlmin({
            minifyCSS: true,
            minifyJS: true,
            collapseWhitespace: true,
            conservativeCollapse: true,
            collapseBooleanAttributes: true,
            decodeEntities: true,
            removeOptionalTags: true,
            removeAttributeQuotes: true,
            removeScriptTypeAttributes: true,
            removeStyleLinkTypeAttributes: true,
            sortAttributes: true,
            sortClassName: true,
        }));
    }
    return pageStream.pipe(gulp.dest("public/"));
});

gulp.task('default', ['css', 'pages', 'compress']);
