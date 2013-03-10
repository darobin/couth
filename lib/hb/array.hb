<fieldset class='couth-array'>
  {{#if description}}<legend>{{description}}</legend>{{/if}}
  <div couth-dnd='{{path}}'>
    <fieldset ng-repeat='item in {{path}}' class='couth-item'>
      <button type='button' class='couth-item-delete btn btn-danger btn-mini' ng-click='$couthArrayDel("{{path}}", $index, $event)'><i class='icon-remove icon-white'></i></button>
      <span role='button' class='couth-move btn btn-mini'><i class='icon-move'></i></span>
      {{#with items}}{{> dispatch}}{{/with}}
    </fieldset>
  </div>
  <div class='control-group'>
    <div class='controls'>
      <button type='button' class='btn btn-success btn-mini' ng-click='$couthArrayAdd("{{path}}", "{{items.emptyType}}", $event)'>Add {{#if items.description}}{{items.description}}{{else}}item{{/if}}</button>
    </div>
  </div>
</fieldset>
