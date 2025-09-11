# Enhanced Actions System - User Guide

## Overview

The enhanced actions system now supports **mandatory parameter validation** and **complex JSON request body templates** with parameter binding. This enables more robust API integrations and better error handling during rule execution.

## New Features

### 1. Mandatory Parameters

You can now mark query parameters and headers as **mandatory**. The rule engine will validate these parameters and throw an error if any mandatory parameter is missing during rule execution.

**Benefits:**
- Early validation prevents runtime API errors
- Better debugging and error messages
- Ensures critical parameters are always provided

### 2. Complex JSON Request Bodies

Actions now support sophisticated request body templates with parameter binding using dot notation.

**Features:**
- **Request Body Template**: Define the JSON structure with placeholder values
- **Parameter Definitions**: Configure typed parameters with validation rules
- **Dot Notation Binding**: Inject parameters into nested JSON structures (e.g., `user.name`, `settings.enabled`)
- **Default Values**: Set fallback values for non-mandatory parameters
- **Type Safety**: Define parameter types (string, number, boolean, object, array)

## Using the Enhanced Action Form

### Creating an Action with Mandatory Parameters

1. **Navigate to Connectors** → Select a connector → **Actions**
2. **Click "Add Action"** to open the enhanced form
3. **Configure Basic Info**: Name, description, HTTP method, endpoint path

### Query Parameters Tab
- **Add parameters** with names and optional default values
- **Check "Mandatory"** to require the parameter during rule execution
- **Add descriptions** to document parameter usage

### Headers Tab
- **Configure custom headers** (authentication headers are handled separately)
- **Mark headers as mandatory** if required by the API
- **Set default values** that can be overridden in rules

### Request Body Tab (POST/PUT/PATCH only)
- **Define Request Body Parameters**: Configure typed parameters for injection
  - Set parameter type (string, number, boolean, object, array)
  - Mark as mandatory or optional
  - Set default values
  - Add descriptions
- **Create Request Body Template**: Define JSON structure using placeholders
- **Fallback Request Body**: Backward compatibility support

## Rule Engine Integration

### Enhanced Parameter Syntax

The rule engine now supports structured parameter passing:

```
call action "create_user" from connector "api_service" with {
  "query_params": {
    "api_version": "v2",
    "format": "json"
  },
  "headers": {
    "X-Custom-Header": "value"
  },
  "body_params": {
    "user.name": "{{context.user_name}}",
    "user.email": "{{context.user_email}}",
    "settings.notifications": true
  }
} map response {
  "user_id" to user_id,
  "status" to creation_status
}
```

### Backward Compatibility

Legacy syntax continues to work (treated as query parameters):

```
call action "get_user" from connector "api_service" with {
  "user_id": "{{context.user_id}}",
  "include_details": "true"
} map response {
  "name" to user_name
}
```

## Validation and Error Handling

### Mandatory Parameter Validation

If a mandatory parameter is missing, the rule engine will:
1. **Stop execution** immediately
2. **Return validation error** with detailed messages
3. **List all missing mandatory parameters**

Example error:
```
Mandatory parameter validation failed
- Mandatory query parameter 'api_key' is missing
- Mandatory header 'X-Client-ID' is missing
- Mandatory request body parameter 'user.email' is missing
```

### Request Body Parameter Injection

Parameters are injected into the request body template using dot notation:

**Template:**
```json
{
  "user": {
    "profile": {
      "name": null,
      "email": null
    },
    "preferences": {
      "theme": "light"
    }
  },
  "metadata": {
    "source": "rule_engine"
  }
}
```

**Parameters:**
- `user.profile.name` → `"John Doe"`
- `user.profile.email` → `"john@example.com"`

**Result:**
```json
{
  "user": {
    "profile": {
      "name": "John Doe",
      "email": "john@example.com"
    },
    "preferences": {
      "theme": "light"
    }
  },
  "metadata": {
    "source": "rule_engine"
  }
}
```

## Best Practices

### Designing Actions
1. **Use mandatory flags** for critical parameters that APIs require
2. **Provide clear descriptions** for all parameters
3. **Set sensible defaults** for optional parameters
4. **Use request body templates** for complex APIs with nested structures

### Rule Writing
1. **Use structured parameter syntax** for complex actions
2. **Leverage context variables** with `{{context.field_name}}` syntax  
3. **Handle validation errors** appropriately in rule logic
4. **Document parameter requirements** in rule comments

### API Integration
1. **Test actions thoroughly** using the built-in test connection feature
2. **Validate JSON templates** before saving actions
3. **Use appropriate parameter types** for better validation
4. **Organize parameters logically** with good naming conventions

## Migration Guide

Existing actions continue to work without changes. To take advantage of new features:

1. **Edit existing actions** using the enhanced form
2. **Mark critical parameters as mandatory** 
3. **Add descriptions** for better documentation
4. **Convert complex request bodies** to use templates and parameters

The enhanced system is fully backward compatible while providing powerful new capabilities for robust API integrations.