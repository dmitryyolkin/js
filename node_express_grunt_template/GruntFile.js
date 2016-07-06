/**
 * Created by dmitry on 06.07.16.
 */
/*global module:false*/
module.exports = function(grunt) {
    'use strict';

    //variables
    var srcDir = 'static/client/';
    var buildDir = 'static/client/';

    // Project configuration.
    grunt.initConfig({
        // Metadata.
        pkg: grunt.file.readJSON('package.json'),

        requirejs: {
            //All possible values can be found here
            //https://github.com/requirejs/r.js/blob/master/build/example.build.js
            options: {

                mainConfigFile: srcDir + 'config.js',
                out: buildDir + 'main-single.js',

                optimize: 'none'
                //'optimize': 'uglify2',
            },
            centralized: {
                //TODO it's very useful
                //if we use modules option (see examples in my github https://github.com/dmitryyolkin/js/tree/master/requirejs)
                //then we have to use 'appDir' and 'dir' attributes and DON'T use out because in this case we optimize whole directory (but not a separate file)

                //if we use 'baseUrl' and 'out' attributes then we optimize one single file only
                //we don't optimize whole directory

                options: {
                    //As a result we have one main,js file including all files in itself in build directory
                    include: ['config', 'main'],

                    //The name parameter is pointing to almond, relative to our baseUrl, which will include almond in the build process.
                    //almond is small AMD (Asynchronious Model Definition) loader that is much smaller than requirejs
                    //and typically included at the same output file
                    name: '../components/almond/almond'
                }
            }
        }

    });

    grunt.loadNpmTasks('grunt-contrib-requirejs');

    grunt.loadNpmTasks('grunt-contrib-less');

    // Default task.
    //grunt.registerTask('default', ['clean', 'requirejs:centralized']);
    grunt.registerTask('default', ['requirejs:centralized']);
};

