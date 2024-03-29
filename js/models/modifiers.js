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

define(["backbone"], function(Backbone) {
    'use strict';

    App.Models.Modifier = Backbone.Model.extend({
        defaults: {
            id: null,
            name: null,
            price: null, // base modifier price
            order_price: null, // modifier price with feature max price 6137
            selected: false,
            sort: null,
            cost: null, // only for order send.
            img: null
        },
        initialize: function() {
            this.set('img', App.Data.settings.get('img_path'));
        },
        addJSON: function(data) {
            if (!data.order_price) {
                data.order_price = data.price;
            }
            this.set(data);
            return this;
        },
        clone: function() {
            var newModifier = new App.Models.Modifier();
            for (var key in this.attributes) {
                var value = this.get(key);
                if (value && value.clone) { value = value.clone(); }
                newModifier.set(key, value, {silent: true });
            }
            return newModifier;
        },
        update: function(newModifier) {
            for (var key in newModifier.attributes) {
                var value = newModifier.get(key);
                if (value && value.update) { this.get(key).update(value); }
                else { this.set(key, value, {silent: true}); }
            }
            return this;
        },
        /**
         * prepare information for submit order
         */
        modifiers_submit: function() {
            if (this.get('selected')) {
                return {
                    modifier: this.get('id'),
                    modifier_cost: (this.get('cost') === null) ? 0 : this.get('cost'),
                    modifier_price: this.isFree() ? this.get('free_amount') * 1 : this.get('order_price') * 1,
                    qty: 1,
                    qty_type: 0
                };
            }
        },
        /**
         * update modifiers price due to max feature
         */
        update_prices: function(max_price) {
            var price = Math.min(this.get('price'), max_price);
            this.set('order_price', price, {silent: true});
            return max_price - price;
        },
        isFree: function() {
            return typeof this.get('free_amount') != 'undefined';
        },
        removeFreeModifier: function() {
            this.unset('free_amount');
        }
    });

    App.Collections.Modifiers = Backbone.Collection.extend({
        model: App.Models.Modifier,
        comparator: function(model) {
            return model.get('sort');
        },
        addJSON: function(data) {
            var self = this;
            data && data.forEach(function(element) {
                var modifier = new App.Models.Modifier();
                modifier.addJSON(element);
                self.add(modifier);
            });
            return this;
        },
        clone: function() {
            var newModifiers = new App.Collections.Modifiers();
            this.each(function(modifier) {
               newModifiers.add(modifier.clone()) ;
            });
            return newModifiers;
        },
        update: function(newModifiers) {
            var self = this;
            newModifiers.each(function(modifier) {
                var oldModifier = self.get(modifier);
                if (oldModifier) {
                    oldModifier.update(modifier);
                } else {
                    self.add(modifier.clone());
                }
            });
            return this;
        },
        /*
         * unselect selected models
         */
        reset_checked: function() {
            this.where({selected: true}).map(function(el) { el.set('selected', false) });
        },
        /**
         * get modifiers sum
         */
        get_sum: function() {
            var sum = 0;
            this.where({selected: true}).forEach(function(modifier) {
                var free_amount = modifier.get('free_amount'),
                    price = modifier.get('order_price');
                sum += modifier.isFree() ? parseFloat(free_amount) : price;
            });
            return sum;
        },
        /**
         * prepare information for submit order
         */
        modifiers_submit: function() {
            var modifiers = [];
            this.each(function(modifier) {
                var res = modifier.modifiers_submit();
                res && modifiers.push(res);
            });
            return modifiers;
        },
        /**
         * update price due to max price feature
         */
        update_prices: function(max_price) {
            this.where({selected: true}).forEach(function(el) {
                max_price = el.update_prices(max_price);
            });
            return max_price;
        },
        removeFreeModifiers: function() {
            this.each(function(modifier) {
                modifier.removeFreeModifier();
            });
        }
    });

    App.Models.ModifierBlock = Backbone.Model.extend({
        defaults: function() {
            return {
                id: null,
                sort: null,
                modifiers: new App.Collections.Modifiers(),
                name: "",
                mod: "",
                img: App.Data.settings.get("img_path"),
                modifier_type: "modifier_multiple",
                lock_amount: null,
                lock_enable: false,
                amount_free: null,
                admin_modifier: false,
                admin_mod_key: "",
                amount_free_is_dollars: false, // true - 'Price', false - 'Quantity', receive from server
                amount_free_selected: [],
                ignore_free_modifiers: false
            };
        },
        initialize: function() {
            this.listenTo(this, 'change:modifiers', function(model) {
                var prevModifiers = model.previousAttributes().modifiers;
                prevModifiers instanceof Backbone.Collection && this.stopListening(prevModifiers);
                this.set('amount_free_selected', []);
                this.initFreeModifiers();
                this.listenToModifiers();
            }, this);

            this.set({
                amount_free_selected: []
            });

            this.checkAmountFree();
        },
        addJSON: function(data) {
            this.set(data);
            var modifiers = new App.Collections.Modifiers();
            modifiers.addJSON(data.modifier || data.modifiers);
            this.set('modifiers', modifiers);
            this.checkAmountFree();
            return this;
        },
        /**
         * clone modifier Block
         */
        clone: function() {
            var newBlock = new App.Models.ModifierBlock(),
                amount_free_selected;

            newBlock.stopListening(newBlock.get('modifiers'));
            for (var key in this.attributes) {
                var value = this.get(key);
                if (value && value.clone) { value = value.clone(); }
                newBlock.set(key, value, {silent: true });
            }

            if(newBlock.get('amount_free_selected').length == 0)
                newBlock.initFreeModifiers();
            else
                newBlock.restoreFreeModifiers();

            newBlock.listenToModifiers();

            return newBlock;
        },
        /**
         * update modifier Block
         */
        update: function(newBlock) {
            for (var key in newBlock.attributes) {
                var value = newBlock.get(key);
                if (value && value.update) { this.get(key).update(value); }
                else { this.set(key, value, {silent: true}); }
            }
        },
        /*
         * unselect attributes
         */
        reset_checked: function() {
            this.get('modifiers').reset_checked();
        },
        /**
         * get modifiers sum
         */
        get_sum: function() {
            if(this.get('admin_modifier') && (this.get('admin_mod_key') === 'SIZE' || this.get('admin_mod_key') === 'SPECIAL')) {
                return 0;
            } else {
                return this.get('modifiers').get_sum();
            }
        },
        /**
         * prepare information for submit order
         */
        modifiers_submit: function() {
            // selected special modifiers add to special_request
            if(this.isSpecial()) {
                return [];
            }

            return this.get('modifiers').modifiers_submit();
        },
        isSpecial: function() {
            return this.get('admin_modifier') && this.get('admin_mod_key') === 'SPECIAL';
        },
        /**
         * update modifiers price due to max feature
         */
        update_prices: function(max_price) {
            if (this.isSpecial()) {
                return max_price;
            } else {
                return this.get('modifiers').update_prices(max_price);
            }
        },
        update_free: function(model) {
            if(this.get('ignore_free_modifiers'))
                return;

            var isPrice = this.get('amount_free_is_dollars'),
                isAdmin = this.get('admin_modifier'),
                amount = this.get('amount_free'),
                selected = this.get('amount_free_selected'),
                needAdd = model.get('selected'),
                index = selected.indexOf(model),
                changed = false;

            // if it is admin_modifier amount_free functionality should be ignored
            if(isAdmin)
                return;

            // add modifier to free selected
            if(amount && needAdd) {
                selected.push(model);
                changed = true;
            }

            // remove modifier from free selected
            if(!needAdd && index > -1) {
                selected.splice(index, 1);
                model.unset('free_amount');
                changed = true;
            }

            if(!changed)
                return;

            if(isPrice)
                this.update_free_price(model);
            else
                this.update_free_quantity(model);

            this.set('amount_free_selected', selected);
        },
        update_free_quantity: function(model) {
            var amount = this.get('amount_free'),
                selected = this.get('amount_free_selected');

            selected.forEach(function(model, index) {
                if(index > amount - 1)
                    model.unset('free_amount');
                else
                    model.set('free_amount', 0);
            });
        },
        update_free_price: function(model) {
            var amount = this.get('amount_free'),
                selected = this.get('amount_free_selected');

            selected.forEach(function(model) {
                var price = model.get('price');
                if(amount == 0)
                    return model.unset('free_amount');

                if(amount < price) {
                    model.set('free_amount', round_monetary_currency(price - amount));
                    amount = 0;
                } else {
                    model.set('free_amount', 0);
                    amount = round_monetary_currency(amount - price);
                }
            });
        },
        initFreeModifiers: function() {
            if(this.get('ignore_free_modifiers'))
                return;

            var modifiers = this.get('modifiers'),
                selected = this.get('amount_free_selected');

            modifiers instanceof Backbone.Collection && modifiers.where({selected: true}).forEach(function(modifier) {
                if(selected.indexOf(modifier) == -1)
                    this.update_free(modifier);
            }, this);
        },
        restoreFreeModifiers: function() {
            if(this.get('ignore_free_modifiers'))
                return;

            var amount_free_selected = this.get('amount_free_selected'),
                restored = [];
            amount_free_selected.forEach(function(modifier, index) {
                var copiedModifier = this.get('modifiers').where({id: modifier.get('id'), selected: true});
                if(copiedModifier.length && copiedModifier[0])
                    restored.push(copiedModifier[0]);
            }, this);
            this.set('amount_free_selected', restored);
        },
        listenToModifiers: function() {
            var modifiers = this.get('modifiers');

            if(!(modifiers instanceof Backbone.Collection))
                return;

            this.listenTo(modifiers, 'change:selected', cb, this);
            this.listenTo(modifiers, 'add', this.initFreeModifiers, this);

            function cb(model, opts) {
                this.trigger('change', this, _.extend({modifier: model}, opts));
                this.update_free(model);
            }
        },
        checkAmountFree: function() {
            if(this.get('amount_free') < 0)
                this.set('amount_free', 0);
        },
        removeFreeModifiers: function() {
            var modifiers = this.get('modifiers');
                modifiers && modifiers.removeFreeModifiers();
            this.set('amount_free_selected', []);
        }
    });

    App.Collections.ModifierBlocks = Backbone.Collection.extend({
        model: App.Models.ModifierBlock,
        comparator: function(model) {
            return model.get('sort');
        },
        initialize: function() {
            this.listenTo(this, 'change', function(model, opts) {
                var isSizeSelection = opts
                        && opts.modifier instanceof App.Models.Modifier
                        && opts.modifier.get('selected')
                        && model instanceof App.Models.ModifierBlock
                        && model.get('admin_mod_key') === 'SIZE'
                        && model.get('admin_modifier'),
                    isSpecialSelection = opts
                        && opts.modifier instanceof App.Models.Modifier
                        && opts.modifier.get('selected')
                        && model instanceof App.Models.ModifierBlock
                        && model.get('admin_mod_key') === 'SPECIAL'
                        && model.get('admin_modifier');

                if (isSpecialSelection) {
                    this.trigger('modifiers_special');
                } else if (isSizeSelection) {
                    this.trigger('modifiers_changed');
                    this.trigger('modifiers_size', this.getSizeModel().get('order_price'));
                } else {
                    this.trigger('modifiers_changed');
                }
            }, this);
        },
        /**
         * update price due to max price feature
         */
        update_prices: function(max_price) {
            this.each(function(el) {
                max_price = el.update_prices(max_price);
            });
            return max_price;
        },
        addJSON: function(data) {
            var self = this;
            data && data.forEach(function(element) {
                var modifierBlock = new App.Models.ModifierBlock();
                modifierBlock.addJSON(element);
                self.add(modifierBlock);
            });
            return this;
        },
        /**
         * clone modifier Blocks
         */
        clone: function() {
            var newBlock = new App.Collections.ModifierBlocks();
            this.each(function(modifierBlock) {
               newBlock.add(modifierBlock.clone()) ;
            });
            return newBlock;
        },
        /**
         * update modifier Blocks
         */
        update: function(newModel) {
            var self = this;
            newModel.each(function(modifierBlock) {
                var oldModifierBlock = self.get(modifierBlock);
                if (oldModifierBlock) {
                    oldModifierBlock.update(modifierBlock);
                } else {
                    self.add(modifierBlock.clone());
                }
            });
            return this;
        },
        /**
         * Get modifiers from backend.
         */
        get_modifiers: function(id_product) {
            var self = this,
                fetching = new $.Deferred(); // Pointer that all data loaded

            $.ajax({
                url: App.Data.settings.get("host") + "/weborders/modifiers/",
                data: {
                    product: id_product,
                    quick: true
                },
                dataType: "json",
                successResp: function(modifierBlocks) {
                    modifierBlocks.forEach(function(modifierBlock) {
                        self.add(new App.Models.ModifierBlock().addJSON(modifierBlock));
                    });
                    fetching.resolve();
                },
                error: function() {
                    App.Data.errors.alert(MSG.ERROR_MODIFIERS_LOAD, true);
                }
            });

            return fetching;
        },
        /**
         * all modifiers to array
         */
        get_modifierList: function() {
            if (!this.list || this.list && this.list.length === 0) {
                var list = [];
                this.each(function(model) {
                    if (model.get('admin_mod_key') !== 'SIZE' && model.get('admin_mod_key') !== 'SPECIAL') {
                        model.get('modifiers').each(function(model) {
                            list.push(model);
                        });
                    }
                });
                this.list = list;
            }
            return this.list;
        },
        /**
         * get selected parameter in size modifier
         * null - size modifiers is unselected
         * undefined - size modifiers is not defined for current product
         */
        getSizeModel: function() {
            var block = this.where({admin_modifier: true, admin_mod_key: 'SIZE'});
            if (block.length !== 0) {
                var modifier = block[0].get('modifiers').where({selected: true});
                if (modifier.length !== 0) {
                    return modifier[0];
                } else {
                    return null;
                }
            } else {
                return undefined;
            }
        },
        get_special: function() {
            var special = [];
            var specialBlock = this.where({ 'admin_mod_key': 'SPECIAL' });
            if (specialBlock && specialBlock.length > 0) {
        		special = specialBlock[0].get('modifiers').where({selected: true});
            }
            return special;
        },
        /**
         * get concatenated special
         */
        get_special_text: function() {
            return this.get_special().map(function(model) { return model.get('name'); }).join(",");
        },
        /**
         *
         * return array with not selected force modifiers
         */
        checkForced: function() {
            var unselected = this.where({forced: true}).filter(function(modifierBlock) {
                var selected = modifierBlock.get('modifiers').where({selected: true});
                return selected.length > 0 ? false : true;
            });

            return unselected.length > 0 ? unselected : true;
        },
        /**
         * unselect all special modifiers
         */
        uncheck_special: function(special_text) {
            var special = this.get_special();
            if (special[0] && special[0].get('name') !== special_text) {
                special.map(function(model) { model.set({selected: false}, {silent: true}); });
            }
        },
        /**
         * get modifiers sum
         */
        get_sum: function() {
            var sum = 0;
            this.each(function(modifierBlock) {
                sum += modifierBlock.get_sum();
            });

            return sum;
        },
        /**
         * combine information for submit order
         */
        modifiers_submit: function() {
            var modifiers = [];
            this.each(function(modifierBlock) {
                modifiers = modifiers.concat(modifierBlock.modifiers_submit());
            });
            return modifiers;
        },
        removeFreeModifiers: function() {
            this.each(function(modifierBlock) {
                modifierBlock.removeFreeModifiers();
            });
        }
    });

    App.Collections.ModifierBlocks.init = function(id_product) {
        var modifier_load = $.Deferred();

        if (App.Data.modifiers[id_product] === undefined ) {
            App.Data.modifiers[id_product] = new App.Collections.ModifierBlocks;
            modifier_load = App.Data.modifiers[id_product].get_modifiers(id_product);
        } else {
            modifier_load.resolve();
        }

        return modifier_load;
    };
});