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

define(["backbone", "factory", 'generator', 'list'], function(Backbone) {
    'use strict';

    var SIZE = 'SIZE',
        SPECIAL = 'SPECIAL';

    App.Views.CoreModifiersView = {};

    App.Views.CoreModifiersView.CoreModifiersItemView = App.Views.ItemView.extend({
        name: 'modifiers',
        mod: 'item',
        events: {
            'change input': 'change',
            'click .special_label': 'add_special'
        },
        initialize: function() {
            App.Views.ItemView.prototype.initialize.apply(this, arguments);
            this.listenTo(this.model, 'change:selected', this.update, this);
            this.listenTo(this.model, 'change:free_amount', this.update_free, this);
        },
        render: function() {
            var model = this.model.toJSON();
            model.type = this.options.type === SIZE || this.options.type === SPECIAL ? 'radio' : 'checkbox';
            model.currency_symbol = App.Data.settings.get('settings_system').currency_symbol;
            model.price = round_monetary_currency(model.price);
            model.slength = model.price.length;
            model.isSpecial = this.options.type === SPECIAL;
            model.isInventoryMatrix = false;
            model.isSize = this.options.type === SIZE;
            model.name = this.model.escape('name');
            model.modifierClassName = this.options.modifierClass.escape('name').replace(/ /g,'_');

            if (model.isSpecial) {
                this.model.set('selected', false);
            }

            this.$el.html(this.template(model));
            this.afterRender(model.sort);
            this.update();
            this.update_free();

            return this;
        },
        add_special: function() {
            this.model.set('selected', true);
        },
        change: function(e, stat) {
            var modifierBlock = this.options.modifierClass;
            var el = $(e.currentTarget),
                checked = el.prop('checked');
            if (el.attr('type') !== 'checkbox') {
                if (stat !== undefined) {
                    this.model.set('selected', stat);
                } else {
                    el.parents('.modifiers-list').find('input').not(el).trigger('change', [false]);
                    this.model.set('selected', checked);
                }
            } else {
                if(checked && modifierBlock.get('lock_amount') > 0 && modifierBlock.get('modifiers').where({selected: true}).length >= modifierBlock.get('lock_amount')) {
                    return el.prop('checked', false);
                }
                this.model.set('selected', checked);
            }
        },
        update: function() {
            if(this.options.type === SIZE || this.options.type === SPECIAL) {
                this.$el.parent().find('input[checked="checked"]').removeAttr('checked');
                this.$el.parent().find('.input.checked').removeClass('checked');
                if(this.model.get('selected')) {
                    this.$('input').attr('checked', 'checked');
                    this.$('.input').addClass('checked');
                }
            } else {
                if(this.model.get('selected')) {
                    this.$('input').attr('checked', 'checked');
                    this.$('.input').addClass('checked');
                }
                else {
                    this.$('input').removeAttr('checked');
                    this.$('.input').removeClass('checked');
                }
            }
        },
        update_free: function() {
            var free_amount = this.model.get('free_amount'),
                currency_symbol = App.Data.settings.get('settings_system').currency_symbol,
                $cost = this.$('.cost'),
                $free = this.$('.free');

            if(typeof free_amount != 'undefined') {
                hide.call($cost);
                $free.find('.value').text(parseFloat(free_amount) ? '+' + currency_symbol + round_monetary_currency(free_amount) : 'free');
                show.call($free);
            } else {
                hide.call($free);
                show.call($cost);
            }

            function show() {
                $(this).removeClass('hidden').addClass('visible');
            }

            function hide() {
                $(this).removeClass('visible').addClass('hidden');
            }
        }
    });

    App.Views.CoreModifiersView.CoreModifiersMatrixView = App.Views.FactoryView.extend({
        name: 'modifiers',
        mod: 'item',
        events: {
            'change input': 'change'
        },
        render: function() {
            var model = {};
            model.type = 'checkbox';
            model.currency_symbol = App.Data.settings.get('settings_system').currency_symbol;
            model.price = "";
            model.slength = 0;
            model.isSpecial = false;
            model.isInventoryMatrix = this.options.data.product.get("attribute_type") === 1;
            model.isSize = false;
            model.id = this.options.data.name.replace(/ /g,'_') + this.options.id;
            model.name = this.options.name;
            model.modifierClassName = this.options.name;

            this.listenLocked = setInterval(this.controlCheckboxes.bind(this), 300);

            this.$el.html(this.template(model));

            return this;
        },
        change: function(e) {
            var data = this.options.data,
                id = this.options.id,
                product = data.product,
                row = 'attribute_' + data.row +'_selected',
                other = 'attribute_' + (data.row === 1 ? 2 : 1) +'_selected',
                el = $(e.currentTarget),
                checked = el.prop('checked'),
                select = product.get(row);

            if(checked) {
                if (select || product.get(other) && data.attributesOther[product.get(other)].indexOf(id) === -1) {
                    return el.prop('checked', false);
                } else {
                    product.set(row, id);
                    this.$('input').attr('checked', 'checked');
                    this.$('.input').addClass('checked');
                }
            } else if (select === id) {
                product.set(row, null);
                this.$('input').removeAttr('checked');
                this.$('.input').removeClass('checked');
            }
        },
        controlCheckboxes: function() {
            var data = this.options.data,
                id = this.options.id,
                product = data.product,
                row = 'attribute_' + data.row +'_selected',
                other = 'attribute_' + (data.row === 1 ? 2 : 1) +'_selected',
                select = product.get(row);

            if (select && select !== id || product.get(other) && data.attributesOther[product.get(other)].indexOf(id) === -1) {
                this.$('input').parent().fadeTo(100, 0.5);
            } else {
                if (select) {
                    this.$('input').attr('checked', 'checked');
                    this.$('.input').addClass('checked');
                }
                this.$('input').parent().fadeTo(100, 1);
            }
        }
    });

    App.Views.CoreModifiersView.CoreModifiersListView = App.Views.ListView.extend({
        name: 'modifiers',
        mod: 'list',
        render: function() {
            this.model = {
                name: this.options.modifierClass.get('name')
            };
            App.Views.ListView.prototype.render.apply(this, arguments);
            this.collection.each(this.addItem.bind(this));
            return this;
        },
        addItem: function(model) {
            var view = App.Views.GeneratorView.create('Modifiers', {
                el: $('<li class="modifier"></li>'),
                mod: 'Item',
                model: model,
                type: this.options.type,
                modifierClass: this.options.modifierClass
            });
            App.Views.ListView.prototype.addItem.call(this, view, this.$('.modifiers'), model.get('sort'), 'li');
            this.subViews.push(view);
        }
    });

    App.Views.CoreModifiersView.CoreModifiersMatrixesView = App.Views.FactoryView.extend({
        name: 'modifiers',
        mod: 'list',
        render: function() {
            var attributes = this.options.data.attributes,
                sorts = this.options.data.attributesSort;
            this.$el.html(this.template({name: this.options.data.name})); // name for paypal

            for(var key in attributes) {
                this.addItem({
                    id: key * 1,
                    name: attributes[key],
                    data: this.options.data,
                    sort: sorts[key * 1]
                });
            }
            return this;
        },
        addItem: function(data) {
            var view = App.Views.GeneratorView.create('Modifiers', {
                el: $('<li class="modifier"></li>'),
                mod: 'Matrix',
                data: data.data,
                id: data.id,
                name: data.name
            });
            this.$('.modifiers-list').append(view.el);
            this.subViews.push(view);
        }
    });

    App.Views.CoreModifiersClassesView = {};

    App.Views.CoreModifiersClassesView.CoreModifiersClassesItemView = App.Views.ItemView.extend({
        name: 'modifiers_classes',
        mod: 'item',
        initialize: function() {
            App.Views.ItemView.prototype.initialize.apply(this, arguments);
            this.listenLocked = setInterval(this.controlCheckboxes.bind(this), 300);

        },
        remove: function() {
            clearInterval(this.listenLocked);
            App.Views.ItemView.prototype.remove.apply(this, arguments);
        },
        render: function() {
            var model = this.model.toJSON(),
                amount_free = model.amount_free,
                isAdmin = model.admin_modifier,
                isPrice = model.amount_free_is_dollars,
                currency = App.Data.settings.get('settings_system').currency_symbol,
                view;

            model.type = 0;
            model.free_modifiers = '';

            if(this.model.get('admin_modifier') && this.model.get('admin_mod_key') === 'SIZE') {
                this.type = SIZE;
                model.type = 1;
            } else if (this.model.get('admin_modifier') && this.model.get('admin_mod_key') === 'SPECIAL') {
                this.type = SPECIAL;
                model.name = 'Select special request';
                model.type = 2;
            }

            if(amount_free && !isAdmin)
                model.free_modifiers = isPrice ? MSG.FREE_MODIFIERS_PRICE.replace('%s', currency + amount_free)
                    : amount_free == 1 ? MSG.FREE_MODIFIERS_QUANTITY1 : MSG.FREE_MODIFIERS_QUANTITY.replace('%s', amount_free);

            this.$el.html(this.template(model));

            var view = App.Views.GeneratorView.create('Modifiers', {
                el: this.$('.modifier_class_list'),
                mod: 'List',
                collection: this.model.get('modifiers'),
                type: this.type,
                modifierClass: this.model
            });

            this.afterRender(this.model.escape('sort'));
            this.subViews.push(view);

            return this;
        },
        controlCheckboxes: function() {
            if(!this.subViews[0])
                return;
            var checked = this.subViews[0].$el.find('input:checked').parent(),
                unchecked = this.subViews[0].$el.find('input:not(:checked)').parent();
            if(!this.type && this.model.get('lock_amount') > 0 && this.model.get('modifiers').where({selected: true}).length >= this.model.get('lock_amount')) {
                checked.fadeTo(100, 1);
                unchecked.fadeTo(100, 0.5);
            } else {
                checked.fadeTo(100, 1);
                unchecked.fadeTo(100, 1);
            }
        }
    });

    App.Views.CoreModifiersClassesView.CoreModifiersClassesMatrixView = App.Views.FactoryView.extend({
        name: 'modifiers_classes',
        mod: 'item',
        render: function() {
            var data = {
                name: this.options.data.name,
                type: 1,
                free_modifiers: ''
            };

            this.$el.html(this.template(data));

            var view = App.Views.GeneratorView.create('Modifiers', {
                el: this.$('.modifier_class_list'),
                mod: 'Matrixes',
                data: this.options.data
            });

            this.subViews.push(view);

            return this;
        }
    });

    App.Views.CoreModifiersClassesView.CoreModifiersClassesListView = App.Views.ListView.extend({
        name: 'modifiers_classes',
        mod: 'list',
        initialize: function() {
            App.Views.ListView.prototype.initialize.apply(this, arguments);
            this.listenTo(this.model.get_modifiers(), 'add', this.addItem, this);
        },
        render: function() {
            var modifiers = this.model.get_modifiers();
            App.Views.ListView.prototype.render.apply(this, arguments);
            modifiers && modifiers.each(this.addItem.bind(this));
            return this;
        },
        addItem: function(model) {
            if(model.get('admin_modifier') && model.get('admin_mod_key') === SPECIAL && !App.Data.settings.get('settings_system').special_requests_online) return;
            var view = App.Views.GeneratorView.create('ModifiersClasses', {
                el: $('<div class="modifier_class_wrapper"></div>'),
                mod: 'Item',
                model: model
            });
            App.Views.ListView.prototype.addItem.call(this, view, this.$('.modifier_classes'), model.escape('sort'));
            this.subViews.push(view);
        }
    });

    App.Views.CoreModifiersClassesView.CoreModifiersClassesMatrixesView = App.Views.FactoryView.extend({
        name: 'modifiers_classes',
        mod: 'matrix',
        render: function() {
            this.modifiers = this.model.get_attributes_list();
            this.product = this.model.get('product');

            var attr = [],
                attribute_1_enable = this.product.get('attribute_1_enable'),
                attribute_2_enable = this.product.get('attribute_2_enable'),
                attribute_1_name = this.product.get('attribute_1_name'),
                attribute_2_name = this.product.get('attribute_2_name');

            attribute_1_enable && attr.push(attribute_1_name);
            attribute_2_enable && attr.push(attribute_2_name);

            this.$el.html(this.template({attributes: attr.join(' / ')}));

            if (!empty_object(this.modifiers)) {
                var data1 = {
                    product: this.product,
                    attributes: this.modifiers.attribute_1_all,
                    attributesSort: this.modifiers.attribute_1_sort,
                    attributesOther: this.modifiers.attribute_2,
                    name: attribute_1_name,
                    row: 1
                }, data2 = {
                    product: this.product,
                    attributes: this.modifiers.attribute_2_all,
                    attributesSort: this.modifiers.attribute_2_sort,
                    attributesOther: this.modifiers.attribute_1,
                    name: attribute_2_name,
                    row: 2
                };
                attribute_1_enable && this.addItem(data1);
                attribute_2_enable && this.addItem(data2);
                this.listenTo(this.product, 'change:attribute_1_selected change:attribute_2_selected', this.update);
                this.update();
            }
            return this;
        },
        addItem: function(data) {
            var view = App.Views.GeneratorView.create('ModifiersClasses', {
                el: $('<div class="modifier_class_wrapper"></div>'),
                mod: 'Matrix',
                data: data
            });

            this.$('.modifier_classes').append(view.el);
            //view.$el.after(view.subViews[0].el);
            this.subViews.push(view);
        },
        update: function() {
            var modifiersEl = this.options.modifiersEl,
                attribute_1_enable = this.product.get('attribute_1_enable'),
                attribute_2_enable = this.product.get('attribute_2_enable');

            if (this.product.check_selected()) {
                var viewModifiers = App.Views.GeneratorView.create('ModifiersClasses', {
                    model: this.model,
                    mod: 'List'
                });

                modifiersEl.append(viewModifiers.el);
                modifiersEl.addClass('product_attributes_selected');
                this.subViews.push(viewModifiers);
                modifiersEl.show();
            } else {
                this.subViews.splice(attribute_1_enable + attribute_2_enable,1).map(function(el) {
                    el.remove();
                });
                modifiersEl.hide();
                modifiersEl.removeClass('product_attributes_selected');
            }
        }
    });

    App.Views.ModifiersView = {};

    App.Views.ModifiersView.ModifiersItemView = App.Views.CoreModifiersView.CoreModifiersItemView;

    App.Views.ModifiersView.ModifiersMatrixView = App.Views.CoreModifiersView.CoreModifiersMatrixView;

    App.Views.ModifiersView.ModifiersListView = App.Views.CoreModifiersView.CoreModifiersListView;

    App.Views.ModifiersView.ModifiersMatrixesView = App.Views.CoreModifiersView.CoreModifiersMatrixesView;

    App.Views.ModifiersClassesView = {};

    App.Views.ModifiersClassesView.ModifiersClassesItemView = App.Views.CoreModifiersClassesView.CoreModifiersClassesItemView;

    App.Views.ModifiersClassesView.ModifiersClassesMatrixView = App.Views.CoreModifiersClassesView.CoreModifiersClassesMatrixView;

    App.Views.ModifiersClassesView.ModifiersClassesListView = App.Views.CoreModifiersClassesView.CoreModifiersClassesListView;

    App.Views.ModifiersClassesView.ModifiersClassesMatrixesView = App.Views.CoreModifiersClassesView.CoreModifiersClassesMatrixesView;
});