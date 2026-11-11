describe('logger', function () {
  var logger = Handlebars.logger;
  var originalLevel;

  beforeEach(function () {
    originalLevel = logger.level;
  });

  afterEach(function () {
    logger.level = originalLevel;
  });

  it('should expose the level constants', function () {
    expect(logger.DEBUG).toBe(0);
    expect(logger.INFO).toBe(1);
    expect(logger.WARN).toBe(2);
    expect(logger.ERROR).toBe(3);
  });

  it('should map the level constants to methodMap entries', function () {
    expect(logger.methodMap[logger.DEBUG]).toBe('debug');
    expect(logger.methodMap[logger.INFO]).toBe('info');
    expect(logger.methodMap[logger.WARN]).toBe('warn');
    expect(logger.methodMap[logger.ERROR]).toBe('error');
  });

  it('should accept level names in lookupLevel', function () {
    expect(logger.lookupLevel('debug')).toBe(logger.DEBUG);
    expect(logger.lookupLevel('INFO')).toBe(logger.INFO);
    expect(logger.lookupLevel('warn')).toBe(logger.WARN);
    expect(logger.lookupLevel('Error')).toBe(logger.ERROR);
  });

  it('should default to the info level', function () {
    expect(logger.level).toBe('info');
    expect(logger.lookupLevel(logger.level)).toBe(logger.INFO);
  });

  it('should log messages at or above the configured level', function () {
    /* eslint-disable no-console */
    var $info = console.info;
    var $error = console.error;
    var calls = [];

    console.info = function () {
      calls.push('info');
    };
    console.error = function () {
      calls.push('error');
    };

    try {
      logger.level = logger.WARN;

      logger.log(logger.INFO, 'ignored');
      logger.log(logger.ERROR, 'shown');

      expect(calls).toEqual(['error']);
    } finally {
      console.info = $info;
      console.error = $error;
    }
    /* eslint-enable no-console */
  });
});
