/*global define*/

define(["backbone", "underscore", "jquery", "utils/utils"], function (Backbone, _, $, Utils) {

  /**
   * Display the concepts as an item in the node list
   */
  var NodeListItemView = (function(){
    // define private variables and methods
    var pvt = {};

    pvt.viewConsts = {
      templateId: "node-title-view-template", // name of view template (warning: hardcoded in html)
      implicitLearnedClass: "implicit-learned-concept-title",
      viewClass: "learn-title-display",
      viewIdPrefix: "node-title-view-", // must also change in parent
      learnedCheckClass: "lcheck",
      learnedClass: "learned-concept-title",
      starredClass: "starred-concept-title"
    };

    // return public object for node list item view
    return Backbone.View.extend({
      template: _.template(document.getElementById( pvt.viewConsts.templateId).innerHTML),

      id: function(){ return pvt.viewConsts.viewIdPrefix +  this.model.id;},

      tagName: "li",

      events: {
        "click .learn-view-check": function(evt){
          evt.stopPropagation();
          this.toggleConceptState(evt, "learn");
        },
        "click .learn-view-star": function(evt){
          evt.stopPropagation();
          this.toggleConceptState(evt, "star");
        },
        "click": function(){
          this.appRouter.changeUrlParams({focus: this.model.id});
        }
      },

      className: function(){
        var viewConsts = pvt.viewConsts,
            thisView = this,
            thisModel = thisView.model,
            aux = window.agfkGlobals.auxModel,
            id = thisModel.id;
        return pvt.viewConsts.viewClass
          + (aux.conceptIsStarred(id) ? " " + viewConsts.starredClass : "")
          + (aux.conceptIsLearned(id) ? " " + viewConsts.learnedClass : "")
          + (thisModel.getImplicitLearnStatus() ? " " + viewConsts.implicitLearnedClass : "");
      },

      /**
       * Initialize the view with appropriate listeners
       */
      initialize: function(inp){
        var thisView = this,
            viewConsts = pvt.viewConsts,
            learnedClass = viewConsts.learnedClass,
            implicitLearnedClass = viewConsts.implicitLearnedClass,
            starredClass = viewConsts.starredClass,
            nodeTag = thisView.model.id,
            aux = window.agfkGlobals.auxModel,
            gConsts = aux.getConsts();
        // set the app router
        thisView.appRouter = inp.appRouter;

        thisView.listenTo(aux, gConsts.learnedTrigger + nodeTag, function(nodeId, nodeSid, status){
          thisView.changeTitleClass(learnedClass, status);
        });
        thisView.listenTo(aux, gConsts.starredTrigger + nodeTag, function(nodeId, nodeSid, status){
          thisView.changeTitleClass(starredClass, status);
        });
        thisView.listenTo(thisView.model, "change:implicitLearnStatus", function(nodeId, nodeSid, status){
          thisView.changeTitleClass(implicitLearnedClass, status);
        });
      },

      /**
       * Render the learning view given the supplied model
       */
      render: function(){
        var thisView = this;
        var thisModel = thisView.model;
        var h = _.clone(thisModel.toJSON());
        h.title = thisModel.getLearnViewTitle();
        thisView.$el.html(thisView.template(h));
        return thisView;
      },

      /**
       * Change the title display properties given by prop
       */
      changeTitleClass: function(classVal, status){
        if (status){
          this.$el.addClass(classVal);
        }
        else{
          this.$el.removeClass(classVal);
        }
      },

      /**
       * Toggle speficied state of given concept
       */
      toggleConceptState: function(evt, state){
        evt.stopPropagation();
        var aux = window.agfkGlobals.auxModel,
            nodeTag = this.model.id;
        state === "learn" ? aux.toggleLearnedStatus(nodeTag) : aux.toggleStarredStatus(nodeTag);
      }
    });
  })();

  return (function(){

  // private class variables and methods
    var pvt = {};
    pvt.prevButtonEl = null;

    pvt.consts = {
      templateId : "concept-list-template",
      viewId: "concept-list",
      clickedItmClass: "clicked-title",
      titleIdPrefix: "node-title-view-",
      visibleClass: "show-clist",
      hiddenClass: "hide-clist",
      viewId: "concept-list-panel",
      activeClass: "active",
      elNameAppend: "-button",
      elNavButtonClass: "el-nav-button"
    };

    return Backbone.View.extend({

      template: _.template(document.getElementById(pvt.consts.templateId).innerHTML),

      id: pvt.consts.viewId,

      events: {
        "keyup #concept-list-search-input": "keyUpCLSearchInput",
        "click #concept-list-show-button": "clickListShowButton",
        "click #concept-list-hide-button": "clickListHideButton",
        "click #cancel-search-input": "clickCancelSearchInput",
        "click .el-nav-button": "handleELButtonClick"
      },

      initialize: function (inp) {
        var thisView = this,
            gConsts = window.agfkGlobals.auxModel.getConsts();
        thisView.idToTitleView = {};
        thisView.listenTo(window.agfkGlobals.auxModel,
                          gConsts.learnedTrigger, thisView.updateTimeEstimate);
        // NOWFIX is this firing?
        thisView.listenTo(thisView.model, "sync", thisView.updateTimeEstimate);
        if (inp !== undefined) {
          thisView.appRouter = inp.appRouter;
        }
      },

      render: function () {
        var thisView = this,
            appRouter = thisView.appRouter,
            nodes = thisView.model.getNodes(),
            curNode,
            nliview;
        thisView.isRendered = false;

        thisView.$el.html(thisView.template());

        var $list = thisView.$el.find("ol"),
            nodeOrdering = thisView.model.getTopoSort();
        // add the list elements with the correct properties
        var i = -1, len = nodeOrdering.length;
        for(; ++i < len;){
          curNode = nodes.get(nodeOrdering[i]);
          nliview = new NodeListItemView({model: curNode, appRouter: appRouter});
          thisView.idToTitleView[curNode.id] = nliview;
          $list.append(nliview.render().el);
        }
        thisView.$el.find("#concept-list").append($list); // TODO move hardcoding

        thisView.isRendered = true;

        return thisView;
      },

      clickListShowButton: function (evt) {
        this.$el.parent().addClass(pvt.consts.visibleClass);
        this.$el.parent().removeClass(pvt.consts.hiddenClass);
      },

      clickListHideButton: function (evt) {
        this.$el.parent().removeClass(pvt.consts.visibleClass);
        this.$el.parent().addClass(pvt.consts.hiddenClass);
      },

      updateTimeEstimate: function(){
        var thisView = this,
            nodes = thisView.model.getNodes(),
            timeEstimate,
            timeStr;
        if (nodes.getTimeEstimate){
          timeEstimate = nodes.getTimeEstimate();
          if (timeEstimate) {
            timeStr = "Completion Time: " + Utils.formatTimeEstimate(timeEstimate);
          } else {
            timeStr = "All done!";
          }
        } else {
          timeStr = "---";
        }
        thisView.$el.find(".time-estimate").html(timeStr); // TODO move hardcoding
      },

      /**
       *
       */
      changeSelectedTitle: function (selId) {
        var thisView = this,
            clickedItmClass = pvt.consts.clickedItmClass;
        thisView.$el.find("." + clickedItmClass).removeClass(clickedItmClass);
        $("#" + thisView.getDomIdFromId(selId)).addClass(clickedItmClass);
      },

      getDomIdFromId: function (id) {
        return pvt.consts.titleIdPrefix + id;
      },

      keyUpCLSearchInput: function () {
        var thisView = this,
            $inpEl = $("#concept-list-search-input"),
            inpVal = $.trim($inpEl.val()).toLowerCase();

        if (inpVal.length) {
          $("#cancel-search-input").show();
        } else {
          $("#cancel-search-input").hide();
        }

        thisView.model.getNodes().each(function (node) {
          if (!inpVal.length || node.get("title").match("^" + inpVal)) {
            $("#" + pvt.consts.titleIdPrefix + node.id).show();
          } else {
            $("#" + pvt.consts.titleIdPrefix + node.id ).hide();
          }
        });

      },

      clickCancelSearchInput: function () {
          $("#concept-list-search-input").val("");
          this.keyUpCLSearchInput();
      },

      /**
       * Handle click event by passing relevant event info to changeActiveELButton
       */
      handleELButtonClick: function(evt){
        var thisView = this;
        var buttonEl = evt.currentTarget;
        thisView.changeActiveELButtonFromDomEl(buttonEl);
        //thisView.appRouter.setELTransition(true);
        thisView.appRouter.changeUrlParams({mode: buttonEl.id.split("-")[0]});
      },

      /**
       * Change the active button to the input name: "explore" or "learn"
       */
      changeActiveELButtonFromName: function(name){
        var $domEl = $("#" + name + pvt.consts.elNameAppend);
        if ($domEl.get(0)){
          this.changeActiveELButtonFromDomEl($domEl.get(0));
        }
      },

      /**
       * Change the active button to the input dom element (must be one of the EL buttons)
       */
      changeActiveELButtonFromDomEl: function(buttonEl){
        if (pvt.prevButtonEl === null || buttonEl.id !== pvt.prevButtonEl.id){
          var activeClass = pvt.consts.activeClass,
              $prevButton = $(pvt.prevButtonEl);

          $prevButton.toggleClass(activeClass);
          $prevButton.prop("disabled", false);

          var $buttonEl = $(buttonEl);
          $buttonEl.toggleClass(activeClass);
          $buttonEl.prop("disabled", true);
          pvt.prevButtonEl = buttonEl;
        }
      },

      /**
       * Return true if the view has been rendered
       */
      isViewRendered: function(){
        return this.isRendered;
      },

      /**
       * Clean up the view
       */
      close: function(){
        this.remove();
        this.unbind();
      }
    });
  })(); // end of return statement
});
