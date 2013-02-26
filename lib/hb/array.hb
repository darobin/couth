<fieldset class='couth-array'>
  {{#if description}}<legend>{{description}}</legend>{{/if}}
  <div couth-dnd='{{path}}'>
    <fieldset ng-repeat='item in {{path}}' class='couth-item'>
      <span class='couth-move btn btn-mini' role='button' style='float: right'><i class='icon-move'></i></span>
      <span class='btn btn-danger btn-mini' role='button' style='float: right' ng-click='$couthArrayDel("{{path}}", $index, $event)'><i class='icon-remove icon-white'></i></span>
      {{#with items}}{{> dispatch}}{{/with}}
    </fieldset>
  </div>
  <span class='btn btn-success btn-mini' role='button' ng-click='$couthArrayAdd("{{path}}", "{{items.emptyType}}", $event)'>Add item</span>
</fieldset>
