'use strict';

const gulp = require('gulp');
const browserSync = require('browser-sync').create();
const sass = require('gulp-sass');
const sourcemaps = require('gulp-sourcemaps');
const concat = require('gulp-concat');
const uglify = require('gulp-uglify-es').default;
const pump = require('pump');
const imagemin = require('gulp-imagemin');
const reload = browserSync.reload;

gulp.task('default', defaultTask);
gulp.task('sass', () => {
  return gulp.src('./src/sass/**/styles.sass')
    .pipe(sourcemaps.init())
    .pipe(sass({outputStyle: 'compressed'}).on('error', sass.logError))
    .pipe(sourcemaps.write('./'))
    .pipe(gulp.dest('./css/'));
});

gulp.task('scripts', () => {
  return gulp.src(['./src/js/idb.js', './src/js/dbhelper.js'])
    .pipe(concat('dball.js'))
    .pipe(gulp.dest('./src/js/'));
});

gulp.task('scripts-main', () => {
  return gulp.src(['./src/js/messages.js','./src/js/main-src.js'])
    .pipe(concat('main.js'))
    .pipe(gulp.dest('./src/js/'));
});

gulp.task('scripts-restinfo', () => {
  return gulp.src(['./src/js/messages.js', './src/js/restaurant_info-src.js'])
    .pipe(concat('restaurant_info.js'))
    .pipe(gulp.dest('./src/js/'));
});

gulp.task('compress', () => {
  return gulp.src(['./src/js/dball.js', './src/js/main.js', './src/js/restaurant_info.js'])
    .pipe(uglify())
    .pipe(gulp.dest('./js/'))
});

gulp.task('swcompress', () => {
  return gulp.src('./src/js/sw.js')
    .pipe(uglify())
    .pipe(gulp.dest('./'))
});

gulp.task('imgcompress', () =>
  gulp.src('./src/img/*')
    .pipe(imagemin([
      imagemin.jpegtran({progressive: true}),
      imagemin.optipng({optimizationLevel: 5})
    ]))
    .pipe(gulp.dest('./img'))
);

gulp.task('icocompress', () =>
  gulp.src('./src/ico/*')
    .pipe(imagemin([
      imagemin.optipng({optimizationLevel: 5})
    ]))
    .pipe(gulp.dest('./ico'))
);

gulp.task('dist', gulp.series('sass', 'scripts', 'scripts-main', 'scripts-restinfo', 'compress', 'swcompress', 'imgcompress', 'icocompress'));

function defaultTask() {
  browserSync.init({
    port: 8000,
    server: './'
  });
  gulp.watch('src/js/**/dbhelper.js', gulp.series('scripts', 'compress')).on('change', reload);
  gulp.watch('src/js/**/main-src.js', gulp.series('scripts-main', 'compress')).on('change', reload);
  gulp.watch('src/js/**/restaurant_info-src.js', gulp.series('scripts-restinfo', 'compress')).on('change', reload);
  gulp.watch('src/js/**/messages.js', gulp.series('scripts-main', 'scripts-restinfo', 'compress')).on('change', reload);
  gulp.watch('src/js/**/sw.js', gulp.series('swcompress')).on('change', reload);
  gulp.watch('src/sass/**/*.sass', gulp.series('sass')).on('change', reload);
  gulp.watch('*.html').on('change', reload);
}