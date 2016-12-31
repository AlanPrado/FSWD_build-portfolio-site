'use strict';

const gulp = require('gulp');
const watch = require('gulp-watch');
const sass = require('gulp-sass');
const autoprefixer = require('gulp-autoprefixer');
const browserSync = require('browser-sync').create();
const pump = require('pump');
const cssnano = require('gulp-cssnano');
const sourcemaps = require('gulp-sourcemaps');
const imagemin = require('gulp-imagemin');
const pngquant = require('imagemin-pngquant');
const imageResize = require('gulp-image-resize');
const rename = require("gulp-rename");
const rm = require("gulp-rm");
const htmlv = require('gulp-html-validator');
const cssv = require('gulp-w3c-css');

const destDir = './docs/';
const appDir = './app/';
const htmlReport = './report/html/';
const cssReport = './report/css/';

function styles(cb, dist) {
	let tasks = [];

	tasks.push(gulp.src(appDir + 'sass/**/*.scss'));
	tasks.push(sourcemaps.init());
	tasks.push(sass());
	tasks.push(
		autoprefixer({
			browsers: ['last 2 versions']
		}));

	if(dist) tasks.push(cssnano());

 	tasks.push(sourcemaps.write());
  tasks.push(gulp.dest(destDir + 'css'));
	tasks.push(browserSync.stream());

	pump(tasks, cb);
}

gulp.task('styles', (cb) => styles(cb));
gulp.task('styles-dist', (cb) => styles(cb, true));

function copy(options, cb) {
	options = options || {};
	options = {
		src: options.src || '',
		dest: options.dest || '',
		enableSourceMaps: options.enableSourceMaps || false,
		imagemin: options.imagemin || false,
		hasBasePath: options.basePath || false
	};

	let taskList = [];
	if(typeof options.src === "object") {
		options.src.forEach(function(el, idx) {
			options.src[idx] = appDir + el;
		});
		taskList.push(gulp.src(options.src));
	} else {
		taskList.push(gulp.src([appDir + options.src, '!' + appDir + '/tests/**/*']));
	}
	if(options.enableSourceMaps) taskList.push(sourcemaps.init());
	if(options.enableSourceMaps) taskList.push(sourcemaps.write());

  if(options.imagemin)
		taskList.push(imagemin({
					            progressive: true,
					            use: [pngquant()]
					        }));

	let destinationPath = options.hasBasePath ? '' : destDir;
	taskList.push(gulp.dest(destinationPath + (options.dest)));
	pump(taskList, cb);
};

function clearDir(path, cb) {
	pump([gulp.src(path, { read: false }), rm()], cb);
};

gulp.task('clear-images', (cb) => clearDir(appDir + '/img/*', cb));
gulp.task('clear-dist', (cb) => clearDir(destDir + '/**/*', cb));

gulp.task('copy-html', (cb) => copy({src: '**/*.html'}, cb));

gulp.task('resize-images', ['clear-images'], (cb) => {
	gulp.start(['copy-fixed-images']);
	let taskList = [];
	function resize(img, opt, crop) {
		var options = {
			 upscale : true,
			 format: 'png',
			 imageMagick: true
		};
		if(opt.width) options.width = opt.width;
		if(opt.height) options.height = opt.height;
		if(crop) options.crop = true;
		taskList.push(gulp.src(appDir + img));
		taskList.push(imageResize(options));
		taskList.push(rename(function (path) { path.basename += "-" + options.width + "w"; }));
		taskList.push(gulp.dest(appDir + '/img/'));
	}
	resize('/img_src/green.jpg',  { width: 1200, height: 400 }, true);
	resize('/img_src/spell*.jpg', { width: 450, height: 160 }, true);
	pump(taskList, cb);
	gulp.start('copy-images');
});

gulp.task('html-validator', (cb) => {
	pump([gulp.src(appDir + '/*.html'),
				htmlv(),
	      gulp.dest(htmlReport)],
				  cb);
});

gulp.task('css-validator', (cb) => {
	pump([gulp.src(destDir + '/css/*.css'),
				cssv(),
	      gulp.dest(cssReport)],
				  cb);
});

gulp.task('copy-images', (cb) => copy({src: 'img/**/*', dest: 'img'}, cb));
gulp.task('copy-fixed-images', (cb) => copy({src: 'img_src/fixed/*', dest: appDir + 'img', basePath: true}, cb));
gulp.task('copy-images-dist', (cb) => copy({src: 'img/**/*', dest: 'img', imagemin: true}, cb));
gulp.task('copy-favicon', (cb) => copy({ src: ['*.png', '*.xml','*.ico','*.json'] }, cb));

//use this task for debug
gulp.task('default', ['copy-html', 'copy-favicon', 'styles'], () => {
	gulp.watch(appDir + 'sass/**/*.scss', ['styles']);
	gulp.watch(appDir + '**/*.html', ['copy-html']);
	gulp.watch(destDir + '**/*.html')
		  .on('change', browserSync.reload);

	browserSync.init({
			 server: destDir
		});
});

//validate files
gulp.task('validate', (cb) => {
	gulp.start('html-validator');
	gulp.start('css-validator');
});

//use this task for build a realease
gulp.task('dist', ['clear-dist'], () => {
	gulp.start(['copy-html', 'copy-images-dist', 'copy-html', 'copy-favicon', 'styles-dist']);
});
