<fieldset class='couth-array'>
  {{#if description}}<legend>{{description}}</legend>{{/if}}
  <div couth-dnd='{{path}}'>
    <fieldset ng-repeat='item in {{path}}' class='couth-item'>
      <span class='couth-move btn btn-mini' style='float: right'><i class='icon-move'></i></span>
      <button class='btn btn-danger btn-mini' style='float: right' ng-click='$couthArrayDel("{{path}}", $index, $event)'><i class='icon-remove icon-white'></i></button>
      {{#with items}}{{> dispatch}}{{/with}}
    </fieldset>
  </div>
  <button class='btn btn-success btn-mini' ng-click='$couthArrayAdd("{{path}}", "{{items.emptyType}}", $event)'>Add item</button>
</fieldset>
