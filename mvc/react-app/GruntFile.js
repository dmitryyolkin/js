/**
 * Created by dmitry on 06.07.16.
 */
/*global module:false*/
module.exports = function (grunt) {
    'use strict';

    /**
     * npm install --save-dev load-grunt-tasks
     *
     * Before
     *   grunt.loadNpmTasks('grunt-shell');
     *   grunt.loadNpmTasks('grunt-sass');
     *   grunt.loadNpmTasks('grunt-recess');
     *   grunt.loadNpmTasks('grunt-bower-requirejs');
     *
     * After
     *   require('load-grunt-tasks')(grunt);
     */
    require("load-grunt-tasks")(grunt);

    // Project configuration.
    grunt.initConfig({
        "babel": {
            options: {
                sourceMap: true
            },
            dist: {
                files: {
                    "dist/App.js": "src/*.js"
                }
            }
        }

    });

    grunt.registerTask("default", ["babel"]);
};

