{{> label}}
<div class='controls'>
  <textarea ng-model='{{path}}' class='input-xxlarge' id='{{id}}'{{#if required}} required{{/if
         }}{{#if pattern}} pattern='{{pattern}}'{{/if}}{{#if maxLength}} maxlength='{{maxLength}}'{{/if}}></textarea>
</div>
