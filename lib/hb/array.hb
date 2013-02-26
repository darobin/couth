<fieldset class='couth-array'>
  {{#if description}}<legend>{{description}}</legend>{{/if}}
  <fieldset ng-repeat='item in {{path}}' class='couth-item'>
    <span class='badge' style='float: left'>\{{$index}}</span>
    <button class='btn btn-danger btn-mini' style='float: right' ng-click='$couthArrayDel("{{path}}", $index, $event)'>x</button>
    {{#with items}}{{> dispatch}}{{/with}}
  </fieldset>
  <button class='btn btn-success btn-mini' ng-click='$couthArrayAdd("{{path}}", "{{items.emptyType}}", $event)'>Add item</button>
</fieldset>
