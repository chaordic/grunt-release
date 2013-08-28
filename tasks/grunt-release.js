/*
 * grunt-release
 * https://github.com/geddski/grunt-release
 *
 * Copyright (c) 2013 Dave Geddes
 * Licensed under the MIT license.
 */

var shell = require('shelljs');
var semver = require('semver');

module.exports = function(grunt){
  grunt.registerTask('release', 'bump version, git tag, git push, npm publish', function(type){
    //defaults
    var options = this.options({
      bump: true,
      file: grunt.config('pkgFile') || 'package.json',
      files: [],
      changelog: false,
      add: true,
      commit: true,
      tag: true,
      push: true,
      pushTags: true,
      npm : true
    });

    var config = setup(options.file, type);
    var templateOptions = {
      data: {
        version: config.newVersion
      }
    };

    var tagName = (function() {
      var tagNameTemplate = grunt.config.getRaw('release.options.tagName') || '<%= version %>';
      return grunt.template.process(tagNameTemplate, templateOptions);
    }());
    var commitMessage = grunt.config.getRaw('release.options.commitMessage') || 'release <%= version %>';
    var tagMessage = grunt.config.getRaw('release.options.tagMessage') || 'version <%= version %>';


    if (options.bump) bump(config);
    if (options.changelog && typeof options.changelog === 'string') changelog();
    if (options.add) add(config);
    if (options.commit) commit(config);
    if (options.tag) tag(config);
    if (options.push) push();
    if (options.pushTags) pushTags(config);
    if (options.npm) publish(config);

    function setup(file, type){
      var pkg = grunt.file.readJSON(file);
      var newVersion = pkg.version;
      if (options.bump) {
        newVersion = semver.inc(pkg.version, type || 'patch');
      }
      return {file: file, pkg: pkg, newVersion: newVersion};
    }

    function changelog(){
      run("grunt " + options.changelog);
    }

    function add(config){
      run('git add ' + options.files.concat([config.file]).join(" "));
    }

    function commit(config){
      var message = grunt.template.process(commitMessage, templateOptions);
      var files = options.files.concat([config.file]).join(" ");
      run('git commit '+ files +' -m "'+ message +'"', files + ' committed');
    }

    function tag(config){
      var message = grunt.template.process(tagMessage, templateOptions);
      run('git tag ' + tagName + ' -m "'+ message +'"', 'New git tag created: ' + tagName);
    }

    function push(){
      run('git push', 'pushed to remote');
    }

    function pushTags(config){
      run('git push --tags', 'pushed new tag '+ tagName +' to remote');
    }

    function publish(config){
      var cmd = 'npm publish';
      var msg = 'published '+ config.newVersion +' to npm';
      var npmtag = getNpmTag();
      if (npmtag){ 
        cmd += ' --tag ' + npmtag;
        msg += ' with a tag of "' + npmtag + '"';
      }
      if (options.folder){ cmd += ' ' + options.folder }
      run(cmd, msg);
    }

    function getNpmTag(){
      var tag = grunt.option('npmtag') || options.npmtag;
      if(tag === true) { tag = config.newVersion }
      return tag;
    }

    function run(cmd, msg){
      var nowrite = grunt.option('no-write');
      if (nowrite) {
        grunt.verbose.writeln('Not actually running: ' + cmd);
      }
      else {
        grunt.verbose.writeln('Running: ' + cmd);
        shell.exec(cmd, {silent:true});
      }

      if (msg) grunt.log.ok(msg);
    }

    function bump(config){
      config.pkg.version = config.newVersion;
      grunt.file.write(config.file, JSON.stringify(config.pkg, null, '  ') + '\n');
      grunt.log.ok('Version bumped to ' + tagName);
    }

  });
};
