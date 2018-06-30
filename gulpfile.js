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

gulp.task('dist', gulp.series('sass', 'scripts', 'compress', 'swcompress', 'imgcompress', 'icocompress'));

function defaultTask() {
  // place code for your default task here
  browserSync.init({
    port: 8000,
    server: './'
  });
  gulp.watch('css/**/*.css').on('change', reload);
  gulp.watch('js/**/*.js').on('change', reload);
  gulp.watch('*.html').on('change', reload);
  gulp.watch('*.js').on('change', reload);
  gulp.watch('src/js/**/dbhelper.js', gulp.series('scripts', 'compress'));
  gulp.watch('src/js/**/main.js', gulp.series('scripts', 'compress'));
  gulp.watch('src/js/**/restaurant_info.js', gulp.series('scripts', 'compress'));
  gulp.watch('src/js/**/sw.js', gulp.series('swcompress'));
  gulp.watch('src/sass/**/*.sass', gulp.series('sass'));
}