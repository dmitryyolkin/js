/**
 * Created by dmitry on 30.12.16.
 */
'use strict';

var Backbone = require('backbone');
var Marionette = require('marionette');
var AdminEditorTemplate = require("hbs!templates/admin/adminEditor");

var $ = require('jquery');

var userModificationFailedClass = '.userModificationFailed';

function go2AdminScreen() {
    Backbone.history.navigate(
        'admin',
        //we have to invoke 'animals' handler
        {trigger: true}
    );
}

module.exports = Marionette.View.extend({
    template: AdminEditorTemplate,

    initialize: function (options) {
        _.extend(this, options);
    },

    events: {
        'click input:button#SaveBtn': 'upsertUser',
        'click input:button#CancelBtn': 'cancel',
        'keyup input:text': 'keyPressEventHandler'
    },

    upsertUser: function () {
        console.log("AdminEditor upsertUser");
        var animals = $(this.el).find('input#animals-txt').val();
        this.model.save(
            {
                name: $(this.el).find('input#name-txt').val(),
                surname: $(this.el).find('input#surname-txt').val(),
                email: $(this.el).find('input#email-txt').val(),
                login: $(this.el).find('input#login-txt').val(),
                roles: $(this.el).find('input#roles-txt').val(),
                animals: animals && animals.length > 0 ? animals.split(',') : []
            },
            {
                success: function (model, response, options) {
                    console.log('User credentials were changed sucessfully: ' + JSON.stringify(response.user));
                    go2AdminScreen();
                },

                error: function (model, xhr, options) {
                    $(userModificationFailedClass).text(xhr.responseText).show();
                }
            }
        );
    },

    cancel: function () {
        console.log("AdminEditor cancel");
        go2AdminScreen();
    },

    keyPressEventHandler: function (event) {
        if (event.keyCode == 13) {
            //it's interesting if I invoke this.render() then method above is executed
            //but data is not updated in UI
            $('input:button#SaveBtn').click();
        } else {
            //скрываем user modification failed message
            hideUserModificationFailedMsg(event);
        }
    },

    hideUserModificationFailedMsg: function () {
        var $userModifFailedEl = $(userModificationFailedClass);
        if ($userModifFailedEl.is(':visible')) {
            $userModifFailedEl.hide();
        }
    },

    onRender: function () {
        console.log("AdminEditor onRender");
    },

    //it's required to show data in hbs template
    serializeData: function () {
        var user = this.model;
        return {
            id: user.get('_id'),
            name: user.get('name'),
            surname: user.get('surname'),
            email: user.get('email'),
            login: user.get('login'),
            roles: user.get('roles'),
            animals: user.get('animals').map(function (animal) {
                return animal.name;
            })
        };
    }

});

