{{> label}}
<div class='controls'>
  <input type='text' ng-model='{{path}}' class='input-xxlarge' id='{{id}}'{{#if required}} required{{/if
         }}{{#if pattern}} pattern='{{pattern}}'{{/if}}{{#if maxLength}} maxlength='{{maxLength}}'{{/if}}
         ng-disabled='$couthMode === "edit" &amp;&amp; $couthTypes["{{couthType}}"].crudOptions.id === "{{name}}"'>
</div>
