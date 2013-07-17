describe("Promise", function() {

	describe("constructor", function() {

		it("does not require arguments", function() {
			var promise = new Promise();

			expect(promise._promiser).toBeNull();
			expect(promise._context).toBeNull();
		});

		it("takes a \"promiser\" object, which is the object making the promise", function() {
			var x = {};
			var promise = new Promise(x);

			expect(promise._promiser).toStrictlyEqual(x);
		});

		it("takes a \"promiser\" object and a context for the callbacks", function() {
			var x = {};
			var context = {};
			var promise = new Promise(x, context);

			expect(promise._promiser).toStrictlyEqual(x);
			expect(promise._context).toStrictlyEqual(context);
		});

	});

	describe("_createCallback", function() {

		it("creates a method on the prototype by the name passed in", function() {
			var TestPromise = function(promiser, context) {
				Promise.call(this, promiser, context);
				this._createCallback("success");
			};
			TestPromise.prototype = new Promise();

			expect(TestPromise.prototype.hasOwnProperty("success")).toBeFalse();
			expect(TestPromise.prototype.success).toBeUndefined();

			var x = {};
			var context = {};
			var instance = new TestPromise(x, context);

			expect(instance.success).toBeFunction();
			expect(TestPromise.prototype.success).toBeFunction();
			expect(Promise.prototype.success).toBeUndefined();
		});

		it("does not overwrite methods by that name if it already exists in the prototype", function() {
			var TestPromise = function(promiser, context) {
				Promise.call(this, promiser, context);
				this._createCallback("success");
			};
			TestPromise.prototype = new Promise();
			TestPromise.prototype.success = function() {};

			var origSuccessMethod = TestPromise.prototype.success;
			var instance = new TestPromise();

			expect(instance.success).toStrictlyEqual(origSuccessMethod);
			expect(TestPromise.prototype.success).toStrictlyEqual(origSuccessMethod);
		});

	});

	describe("_createCallbacks", function() {

		it("accepts a single array argument of callback names", function() {
			var TestPromise = function(promiser, context) {
				Promise.call(this, promiser, context);
				this._createCallbacks(["success", "complete"]);
			};
			TestPromise.prototype = new Promise();

			var instance = new TestPromise();

			expect(instance.success).toBeFunction();
			expect(instance.complete).toBeFunction();
			expect(TestPromise.prototype.success).toBeFunction();
			expect(TestPromise.prototype.complete).toBeFunction();
		});

		it("accepts an arbitrary number of callback names", function() {
			var TestPromise = function(promiser, context) {
				Promise.call(this, promiser, context);
				this._createCallbacks("success", "complete");
			};
			TestPromise.prototype = new Promise();

			var instance = new TestPromise();

			expect(instance.success).toBeFunction();
			expect(instance.complete).toBeFunction();
			expect(TestPromise.prototype.success).toBeFunction();
			expect(TestPromise.prototype.complete).toBeFunction();
		});

	});

	describe("callbackDefined", function() {

		var TestPromise = function(promiser, context) {
			Promise.call(this, promiser, context);
			this._createCallbacks("success", "error", "complete");
		};
		TestPromise.prototype = new Promise();

		beforeEach(function() {
			this.instance = new TestPromise();
		})

		it("returns true if a sub class has defined a callback", function() {
			expect(this.instance.callbackDefined("success")).toBeTrue();
		});

		it("returns false if a sub class has not defined that callback", function() {
			expect(this.instance.callbackDefined("I_do_not_exist")).toBeFalse();
		});

		it("returns false for methods that exist on the Promise class, but not defined as a callback", function() {
			expect(this.instance.callbackDefined("destructor")).toBeFalse();
			expect(this.instance.callbackDefined("fullfill")).toBeFalse();
		});

	});

	describe("fullfill", function() {

		var TestPromise = function(promiser, context) {
			Promise.call(this, promiser, context);
			this._createCallbacks("success", "error", "complete");
		};
		TestPromise.prototype = new Promise();

		it("throws an error if no arguments are given", function() {
			var promise = new TestPromise();

			expect(function() {
				promise.fullfill();
			}).toThrowError();
		});

		it("fullfills a promise by the given name if one exists", function() {
			var o = {
				test: function() {}
			};
			spyOn(o, "test");

			var promise = new TestPromise();
			promise.success(o.test);
			promise.fullfill("success");

			expect(o.test).wasCalled();
		});

		it("passes the promiser to all the callbacks as the last argument", function() {
			var x = {};

			var o = {
				test: function(promiser) {
					expect(promiser).toStrictlyEqual(x);
				}
			};
			spyOn(o, "test").andCallThrough();

			var promise = new TestPromise(x);
			promise.success(o.test);
			promise.fullfill("success");

			expect(o.test).wasCalled();
		});

		it("invokes callbacks with the given context", function() {
			var x = {};

			var context = {
				test: function(promiser) {
					expect(this).toStrictlyEqual(context);
				}
			};
			spyOn(context, "test").andCallThrough();

			var promise = new TestPromise(x, context);
			promise.success(context.test);
			promise.fullfill("success");
		});

		it("passes arbitrary arguments on to the callbacks", function() {
			var x = {};
			var a = {}, b = false, c = 32;

			var context = {
				test: function(arg1, arg2, arg3, promiser) {
					expect(this).toStrictlyEqual(context);
					expect(arg1).toStrictlyEqual(a);
					expect(arg2).toEqual(b);
					expect(arg3).toEqual(c);
					expect(promiser).toStrictlyEqual(x);
				}
			};
			spyOn(context, "test").andCallThrough();

			var promise = new TestPromise(x, context);
			promise.success(context.test);

			promise.fullfill("success", a, b, c);
		});

		describe("before callbacks have been added", function() {

			it("caches the fullfilled promise until a callback has been added by that name", function() {
				var promiser = {};

				var context = {
					test: function() {}
				};
				spyOn(context, "test");

				var promise = new TestPromise(promiser, context);

				expect(promise._pendingCallbacks.success).toBeInstanceof(Object);
				expect(promise._pendingCallbacks.success.args).toBeInstanceof(Array);
				expect(promise._pendingCallbacks.success.args.length).toEqual(1);
				expect(promise._pendingCallbacks.success.args[0]).toStrictlyEqual(promiser);
				expect(promise._pendingCallbacks.success.context).toStrictlyEqual(context);

				promise.fullfill("success");

				expect(context.test).wasCalledWith(promiser);
			});

		});

	});

	describe("inheritance", function() {

		it("must be sub classes to be useful", function() {
			var ChildPromise = function(promiser, context) {
				Promise.call(this, promiser, context);
				this._createCallbacks("a", "b");
			};
			ChildPromise.prototype = new Promise();

			var promiser = {};
			var context = {};
			var instance = new ChildPromise(promiser, context);

			expect(instance).toBeInstanceof(Promise);
			expect(instance).toBeInstanceof(ChildPromise);
			expect(ChildPromise.prototype.a).toBeFunction();
			expect(ChildPromise.prototype.b).toBeFunction();
			expect(instance.a).toBeFunction();
			expect(instance.b).toBeFunction();
		});

		it("can have sub classes of sub classes", function() {
			var ChildPromise = function(promiser, context) {
				Promise.call(this, promiser, context);
				this._createCallbacks("a", "b");
			};
			ChildPromise.prototype = new Promise();

			var GrandChildPromise = function(promiser, context) {
				ChildPromise.call(this, promiser, context);
				this._createCallbacks("c");
			};
			GrandChildPromise.prototype = new ChildPromise();

			var promiser = {};
			var context = {};
			var instance = new GrandChildPromise(promiser, context);

			expect(instance).toBeInstanceof(Promise);
			expect(instance).toBeInstanceof(ChildPromise);
			expect(instance).toBeInstanceof(GrandChildPromise);

			expect(ChildPromise.prototype.a).toBeUndefined();
			expect(ChildPromise.prototype.b).toBeUndefined();
			expect(ChildPromise.prototype.c).toBeUndefined();

			expect(GrandChildPromise.prototype.a).toBeFunction();
			expect(GrandChildPromise.prototype.b).toBeFunction();
			expect(GrandChildPromise.prototype.c).toBeFunction();

			expect(instance.a).toBeFunction();
			expect(instance.b).toBeFunction();
			expect(instance.c).toBeFunction();
		});

	});

	describe("errors in callbacks", function() {
		xit("should be tested");
	});

});