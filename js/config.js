/*
 * Revel Systems Online Ordering Application
 *
 *  Copyright (C) 2014 by Revel Systems
 *
 * This file is part of Revel Systems Online Ordering open source application.
 *
 * Revel Systems Online Ordering open source application is free software: you
 * can redistribute it and/or modify it under the terms of the GNU General
 * Public License as published by the Free Software Foundation, either
 * version 3 of the License, or (at your option) any later version.
 *
 * Revel Systems Online Ordering open source application is distributed in the
 * hope that it will be useful, but WITHOUT ANY WARRANTY; without even the
 * implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Revel Systems Online Ordering Application.
 * If not, see <http://www.gnu.org/licenses/>.
 */

define({
    baseUrl: ".",
    paths: {
        app: "js/app",
        config: "js/config",
        jquery: "js/libs/jquery/jquery",
        jquery_ui_draggable: "js/libs/jquery/jquery.ui.draggable",
        jquery_alerts: "js/libs/jquery/jquery.alerts",
        jquery_gallery: 'js/libs/jquery/jquery.gallery',
        jquery_migrate: "js/libs/jquery/jquery-migrate.min",
        jquery_numbermask: "js/libs/jquery/jquery.number_mask",
        backbone: "js/libs/backbone",
        cssua: "js/libs/cssua",
        underscore: "js/libs/underscore",
        functions : "js/functions",
        async: "js/libs/require_async",
        about: "js/models/about",
        customers: "js/models/customers",
        childproducts: "js/models/childproducts",
        errors : "js/models/errors",
        myorder: "js/models/myorder",
        settings: "js/models/settings",
        timetable: "js/models/timetable",
        factory: "js/views/factory",
        list: "js/views/list",
        generator: "js/views/generator",
        tax: "js/models/tax",
        total: "js/models/total",
        categories: "js/models/categories",
        products: "js/models/products",
        modifiers: "js/models/modifiers",
        tip: "js/models/tip",
        card: "js/models/card",
        checkout: "js/models/checkout",
        geopoint: "js/common/geopoint",
        main_router: "js/routers/main",
        spinner: "js/spinner",
        log: "js/models/log",
        delivery: "js/models/delivery",
        delivery_addresses: "js/views/delivery_addresses",
        checkout_view: "js/views/checkout",
        categories_view: "js/views/categories",
        products_view: "js/views/products",
        modifiers_view: "js/views/modifiers",
        myorder_view: "js/views/myorder",
        quantity_view: "js/views/quantity",
        store_info_view: "js/views/store_info",
        total_view: "js/views/total",
        tips_view: "js/views/tips",
        card_view: "js/views/card",
        instructions_view: "js/views/instructions",
        done_view: "js/views/done",
        slider_view: "js/views/slider",
        search: "js/models/search",
        subcategories: "js/models/subcategories"
    },
    waitSeconds: 30,
    shim: {
        "jquery": {
            exports: "$"
        },
        "jquery_ui_draggable": {
            deps: ["jquery"],
            exports: "$.ui.draggable"
        },
        "jquery_alerts": {
            deps: ["jquery", "jquery_migrate", "jquery_ui_draggable"],
            exports: "$.alerts"
        },
        "jquery_migrate": {
            deps: ["jquery"],
            exports: "$.migrate"
        },
        "jquery_numbermask": {
            deps: ["jquery"],
            exports: "$.numbermask"
        },
        "backbone": {
            deps: ["underscore", "jquery"],
            exports: "Backbone"
        },
        "cssua": {
            exports: "cssua"
        },
        "underscore": {
            exports: "_"
        },
        "functions": {
            deps: ["underscore", "jquery"]
        },
        "customers": {
            deps: ["backbone"]
        },
        "errors" : {
            deps: ["backbone", "functions"]
        },
        "myorder": {
            deps: ["backbone"]
        },
        "settings": {
            deps: ["backbone"]
        },
        "timetable": {
            deps: ["settings"]
        },
        "factory": {
            deps: ["backbone"]
        },
        "generator": {
            deps: ["backbone"]
        },
        "total": {
            deps: ["backbone"]
        },
        "categories": {
            deps: ["backbone"]
        },
        "products": {
            deps: ["backbone"]
        },
        "modifiers": {
            deps: ["backbone"]
        },
        "tip": {
            deps: ["backbone"]
        },
        "card": {
            deps: ["backbone"]
        },
        "checkout": {
            deps: ["backbone"]
        },
        "main_router": {
            deps: ["backbone"]
        },
        "spinner": {
            deps: ["jquery"]
        },
        "log": {
            deps: ["backbone"]
        },
        "delivery": {
            deps: ["backbone"]
        },
        "delivery_addresses": {
            deps: ["backbone", "factory"]
        },
        "checkout_view": {
            deps: ["backbone", "factory"]
        },
        "myorder_view": {
            deps: ["backbone", "factory"]
        },
        "total_view": {
            deps: ["backbone", "factory"]
        },
        "tips_view": {
            deps: ["backbone", "factory"]
        },
        "instructions_view": {
            deps: ["backbone", "factory"]
        },
        "search": {
            deps: ["products"]
        }
    },
    map: {
        "*": {}
    },
    packages: []
});