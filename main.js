/**
 * Created by Paul on 22.03.2015.
 */

(function (window) {

  var hostWindow;
  var hostOrigin = '*';
  var pageBase = 'index.php?';
  var dateFormat;

  var timer;

  var FieldBuilder = (function () {

    var _makeTplField = function (templateId) {
      return function (field) {
        var html = $(templateId).text();
        var compiledTpl = _.template(html);
        return $(compiledTpl(field));
      }
    };

    var makeSelect = function (field, isMultiselect) {
      isMultiselect = isMultiselect || false;
      var $el = _makeTplField(isMultiselect ? '#tpl-field-multiselect' : '#tpl-field-dropdown')(field);
      var $select = $el.find('select');
      if (!isMultiselect && !field.options.is_required) {
        $('<option value=""></option>').appendTo($select);
      }
      field.options.items.split('\n').forEach(function (entry) {
        var pair = $.trim(entry).split(/\s*,\s*/, 2);
        $('<option value="' + pair[0] + '">' + pair[1] + '</option>').appendTo($select);
      });
      $select.val(field.options.default_value);
      return $el;
    };

    var makeUserField = function (field, users) {
      var $el = _makeTplField('#tpl-field-dropdown')(field);
      var $select = $el.find('select');
      if (!field.options.is_required) {
        $('<option value=""></option>').appendTo($select);
      }
      users.forEach(function (user) {
        $('<option value="' + user.id + '">' + user.name + '</option>').appendTo($select);
      });
      $select.val(field.options.default_value);
      return $el;
    };

    var makeDate = function (field) {
      var $el = _makeTplField('#tpl-field-string')(field);
      $el.find('input').datepicker({format: dateFormat, clearBtn: true, todayHighlight: true});
      return $el;
    };

    var makeMilestoneField = function (field, milestones) {
      var $el = _makeTplField('#tpl-field-dropdown')(field);
      var $select = $el.find('select');

      // In reverse order, because they are displayed this way in TestRail
      milestones.forEach(function (milestone) {
        $('<option value="' + milestone.id + '">' + milestone.name + '</option>').prependTo($select);
      });
      if (!field.options.is_required) {
        $('<option value=""></option>').prependTo($select);
      }

      $select.val(field.options.default_value);
      return $el;
    };

    var makeSteps = function (field) {
      field.ee = {
        1: { content: 'Veni', expected: 'Verify that "veni" navigated to expected state'},
        2: { content: 'Vidi', expected: 'Verify "vidi" returned sensible results'},
        3: { content: 'Vici', expected: 'Verify "vici" completed successfully'}
      };
      return _makeTplField('#tpl-field-steps')(field);
    };

    return {
      makeString: _makeTplField('#tpl-field-string'),
      makeInteger: _makeTplField('#tpl-field-integer'),
      makeText: _makeTplField('#tpl-field-text'),
      makeUrl: _makeTplField('#tpl-field-url'),
      makeCheckbox: _makeTplField('#tpl-field-checkbox'),
      makeSteps: makeSteps,
      makeSelect: makeSelect,
      makeUserField: makeUserField,
      makeDate: makeDate,
      makeMilestoneField: makeMilestoneField
    }
  })();

  var _handleMessage = function (event) {
    var data = event.data;

    // Arbitrate messages by type
    switch (data.type) {
      case 'attached' :
      {
        clearTimeout(timer);

        hostWindow = event.source;
        hostOrigin = data.host;
        dateFormat = data.dateFormat;
        pageBase = data.pageBase;

        $('#greeting').text("Hi, " + data.user.name + "!");

        hostWindow.postMessage({type: 'request_cases_config'}, hostOrigin);
        break;
      }
      case 'request_cases_config_response' :
      {
        var configs = data.body;
        _fillForm(configs);
        break;
      }
      case 'save_case_response' :
      {
        if (data.success) {
          alert('Case #' + data.payload.id + ' saved!');
          close(pageBase + '/cases/view/' + data.payload.id);
        } else {
          alert('Saving case failed. Error: ' + data.payload.error);
        }
        break;
      }
      case 'detached' :
      {
        close();
        break;
      }
      default :
      {
        console.warn('Unexpected plugin event type', data);
      }
    }
  };

  var _fillForm = function (configs) {
    // Set section, type, priority, milestone
    var $section = $('#section_id');
    var $type = $('#type_id');
    var $priority = $('#priority_id');
    var $milestone = $('#milestone_id');

    configs.sections.forEach(function (section) {
      $('<option value="' + section.id + '">' + _.repeat('&nbsp;&nbsp;', section.depth) + section.name + '</option>').appendTo($section);
    });

    configs.types.forEach(function (type) {
      $('<option value="' + type.id + '"' + (type.is_default ? ' selected="selected"' : '') + '>' + type.name + '</option>').appendTo($type);
    });

    configs.priorities.forEach(function (priority) {
      $('<option value="' + priority.id + '"' + (priority.is_default ? ' selected="selected"' : '') + '>' + priority.name + '</option>').prependTo($priority);
    });

    configs.milestones.forEach(function (milestone) {
      $('<option value="' + milestone.id + '">' + milestone.name + '</option>').prependTo($milestone);
    });
    $('<option value=""></option>').prependTo($milestone);

    // Add custom fields
    var $topFields = $('#top-fields');
    var $bottomFields = $('#bottom-fields');
    configs.fields.forEach(function (field) {
      switch (field.type_id) {
        case 1:
          FieldBuilder.makeString(field).appendTo($topFields);
          break;
        case 2:
          FieldBuilder.makeInteger(field).appendTo($topFields);
          break;
        case 3:
          FieldBuilder.makeText(field).appendTo($bottomFields);
          break;
        case 4:
          FieldBuilder.makeUrl(field).appendTo($topFields);
          break;
        case 5:
          FieldBuilder.makeCheckbox(field).appendTo($topFields);
          break;
        case 6:
          FieldBuilder.makeSelect(field, false).appendTo($topFields);
          break;
        case 7:
          FieldBuilder.makeUserField(field, configs.users).appendTo($topFields);
          break;
        case 8:
          FieldBuilder.makeDate(field).appendTo($topFields);
          break;
        case 9:
          FieldBuilder.makeMilestoneField(field, configs.milestones).appendTo($topFields);
          break;
        case 10:
          FieldBuilder.makeSteps(field).appendTo($bottomFields);
          break;
        case 12:
          FieldBuilder.makeSelect(field, true).appendTo($bottomFields);
          break;
      }
    });

    // Finally attach submit listener
    $('form').on('submit', function(ev) {
      ev.preventDefault();
      _submitForm();
    });

    // and display the fo
    $('#loading').hide();
    $('#form-container').show();
  };

  var _readForm = function () {
    var output = {};
    $('form input[type!=checkbox]').each(function () {
      var $elem = $(this);
      var val = $.trim($elem.val());
      output[$elem.attr('name')] = (!val ? null : $elem.attr('type') == 'number' ? parseInt(val, 10) : val);
    });
    $('form textarea[name]').each(function () {
      var $elem = $(this);
      output[$elem.attr('name')] = $.trim($elem.val());
    });
    $('form input[type=checkbox]').each(function () {
      output[$(this).attr('name')] = this.checked;
    });
    $('form select').each(function () {
      var $elem = $(this);
      var val = $elem.val();
      if ($.isArray(val)) {
        output[$elem.attr('name')] = $.map(val, function (elem) {
          return elem == '' ? elem : parseInt(elem, 10)
        });
      } else {
        output[$elem.attr('name')] = (!val ? null : parseInt(val, 10));
      }
    });

    var $steps = $('.separate-steps');
    if ($steps.length !== 0) {
      var stepsData = [];
      $steps.find('.separate-step').each(function() {
        var entry = {};
        var $row = $(this);
        var $res = $row.find('.step-result');
        entry.content = $row.find('.step-description').val();
        if ($res.length !== 0) {
          entry.expected = $res.val();
        }
        stepsData.push(entry);
      });
      output[$steps.attr('id')] = stepsData;
    }
    return output;
  };

  var _submitForm = function() {
    var payload = _readForm();
    hostWindow.postMessage({type: 'save_case', body: payload}, hostOrigin);
  };

  var _isEmbedded = function () {
    return window.parent != window;
  };

  /**
   * Start the plugin: register event listener and emit "attach" event to the parent window
   */
  var start = function () {
    if (_isEmbedded()) {
      window.addEventListener('message', _handleMessage, false);
      window.parent.postMessage({'type': 'attach'}, hostOrigin);

      // Alert if plugin cannot be attached
      timer = setTimeout(function () {
        alert('Failed to attach to TestRail after 5s timeout.\n\nPossible causes are:\n1. Bug or error during communication\n2. Networking error\n3. No TestRail UI script found on host page or it is broken');
      }, 5000);

    } else {
      $('#loading').hide();
      $('#warning').show().html('Plugin is not loaded within TestRail context. Find more information <a href="https://discuss.gurock.com/t/ui-script-plugin-poc-testrail-plugins-working-demo/1908">here</a>.<br>You can still examine the code, even though it\'s pretty atrocious at the moment.');
    }
  };

  var close = function (redirectTo) {
    console.info('Closing plugin. Redirecting to: ' + redirectTo);
    window.removeEventListener('message', _handleMessage, false);
    window.parent.postMessage({'type': 'detach', redirectTo: redirectTo}, hostOrigin);
  };

  window.App = {
    start: start,
    close: close
  }

})(window);
