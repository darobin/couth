{{> label}}
<div class='controls'>
  <input type='time' ng-model='{{path}}' class='input-xxlarge' id='{{id}}'{{#if required}} required{{/if
         }} ng-disabled='$couthMode === "edit" &amp;&amp; $couthTypes["{{couthType}}"].crudOptions.id === "{{name}}"'>
</div>
