{{> label}}
<div class='controls'>
  <input type='time' ng-model='{{path}}' id='{{id}}'{{#if required}} required{{/if
         }} ng-disabled='$couthMode === "edit" &amp;&amp; $couthTypes["{{couthType}}"].crudOptions.id === "{{name}}"'>
</div>
