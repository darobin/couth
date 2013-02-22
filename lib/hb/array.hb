<fieldset>
  <legend>{{description}}</legend>
  <fieldset ng-repeat='item in {{path}}'>
    {{#with items}}{{> dispatch}}{{/with}}
  </fieldset>
  <fieldset class='couth-item-add'>
    {{#with items}}{{> dispatch}}{{/with}}
  </fieldset>
</fieldset>
