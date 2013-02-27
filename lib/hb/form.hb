<form ng-controller='CouthFormCtrl' ng-submit='$couthSave()' name='$couthForm' 
      class='form-horizontal' couth-type='{{couthType}}'>
  <div class='couth-form-controls'>
    <button type='button' class='btn btn-success' ng-show='!$couthFormShow' ng-click='$emit("couth:new", "{{couthType}}")'>New{{#if description}} {{description}}{{/if}}</button>
    <button type='button' class='btn' ng-show='$couthFormShow' ng-click='$couthFormShow = false'>Cancel</button>
  </div>
  <fieldset ng-show='$couthFormShow'>
    {{#if description}}<legend>{{description}}</legend>{{/if}}
    {{> descend}}
    <div class='form-actions'>
      <button type='button' ng-click='$couthReset($event)' class='btn btn-danger'>Reset</button>
      <button type='submit' class='btn btn-success'>Save</button>
    </div>
  </fieldset>
</form>
