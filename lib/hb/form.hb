<form ng-controller='CouthFormCtrl' ng-submit='$couthSave()' name='$couthForm' class='form-horizontal'>
  <fieldset>
    {{#if description}}<legend>{{description}}</legend>{{/if}}
    {{> descend}}
    <div class='form-actions'>
      <button type='reset' class='btn btn-danger'>Reset</button>
      <button type='submit' class='btn btn-success'>Save</button>
    </div>
  </fieldset>
</form>
