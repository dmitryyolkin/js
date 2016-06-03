/*global module:false*/
module.exports = function(grunt) {
    'use strict';

    //variables
    var scrDir = 'static/client/';
    var buildDir = 'static/client/build';

    // Project configuration.
    grunt.initConfig({
        // Metadata.
        pkg: grunt.file.readJSON('package.json'),

        //clean build directory
        clean: [buildDir],

        requirejs: {
            //All possible values can be found here
            //https://github.com/requirejs/r.js/blob/master/build/example.build.js
            options: {
                'appDir': scrDir,
                'dir': buildDir,
                'mainConfigFile': scrDir + 'config.js',
                'optimize': 'none'
                //'optimize': 'uglify2',
                //'normalizeDirDefines': 'skip',
                //'skipDirOptimize': true,
            },
            centralized: {
                options: {
                    //modules specifies what module should be optimized
                    //in name we specify name of JS file

                    //As a result we have one main,js file including all files in itself in build directory
                    //All other files can be removed
                    'modules': [{
                        'name': 'main',
                        'include': [
                            'jquery',
                            'underscore',
                            'backbone'
                        ]
                    }]
                }
            },

            centralizedAlmond: {
                //almond is small AMD (Asynchronious Model Definition) loader that is much smaller than requirejs
                //and typically included at the same output file

                //Useful links:
                //https://github.com/requirejs/almond
                //http://www.codechewing.com/library/optimise-requirejs-almond-grunt/

                options: {
                    //As a result we have one main.js file including all files in itself in build directory
                    //All other files can be removed

                    //In addition almond.js in included in main.js as well and require.js can be removed from build directory as well
                    almond: true,

                    'modules': [{
                        'name': 'main',
                        'include': [
                            'jquery',
                            'underscore',
                            'backbone',

                            //if config is not included in final file then almond configuration doesn't work
                            'config'
                        ]
                    }]
                }
            }

        }

    });

    // These plugins provide necessary tasks.
    //grunt.loadNpmTasks('grunt-contrib-jshint');

    //clean build directory
    grunt.loadNpmTasks('grunt-contrib-clean');

    //grunt.loadNpmTasks('grunt-contrib-requirejs');
    //grunt-requirejs is much better becasue it contains internally almond,js and other modules
    //if you want to compile with almond please use grunt-requirejs
    //if you don't need almond you can use grunt-contrib-requirejs
    grunt.loadNpmTasks('grunt-requirejs');


    // Default task.
    //grunt.registerTask('default', ['clean', 'requirejs:centralized']);
    grunt.registerTask('default', ['clean', 'requirejs:centralizedAlmond']);
    //grunt.registerTask('default', ['clean', 'requirejs:independent', 'string-replace', 'copy']);
    //grunt.registerTask('default', ['clean', 'requirejs:shared']);
};
