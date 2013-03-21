{{> label}}
<div class='controls'>
  <!-- XXX this could use some JS love, but no option seemed great -->
  <input type='datetime-local' ng-model='{{path}}' class='input-xxlarge' id='{{id}}'{{#if required}} required{{/if
         }} pattern='\d{4}-\d\d-\d\dT\d\d:\d\d(?::\d\d(?:\.\d{1,3})?)?'
         ng-disabled='$couthMode === "edit" &amp;&amp; $couthTypes["{{couthType}}"].crudOptions.id === "{{name}}"'>
</div>
