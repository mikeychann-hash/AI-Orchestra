/**
 * Phase 3 Example - BackEndDevAgent
 *
 * Demonstrates using the BackEndDevAgent to generate Express API routes
 */

import {
  BackEndDevAgent,
  BackEndTools,
  ContextProviderFactory,
} from '../src/index.js';

async function main() {
  console.log('⚙️  Phase 3: BackEndDevAgent Example\n');

  // Create backend development agent (uses Ollama mistral:7b)
  const backendAgent = new BackEndDevAgent({
    name: 'API Route Generator',
  });

  // Add API standards context
  backendAgent.registerContextProvider(
    ContextProviderFactory.static(
      'API Standards',
      `API Development Standards:
- Follow REST conventions (GET for read, POST for create, PUT/PATCH for update, DELETE for remove)
- Use proper HTTP status codes (200, 201, 400, 401, 403, 404, 500, etc.)
- Always include error handling with try-catch
- Validate input using Joi or Zod
- Return consistent JSON response format: { success: boolean, data?: any, error?: string }
- Use async/await for all database operations
- Implement rate limiting for public endpoints
- Add authentication middleware where needed
- Log errors with context information`
    )
  );

  // Register specialized tools
  backendAgent.registerTool(BackEndTools.validateEndpoint());
  backendAgent.registerTool(BackEndTools.checkSecurity());

  console.log('Agent configured ✓\n');

  // Example 1: Generate User Authentication Endpoint
  console.log('🔐 Example 1: User Authentication Endpoint\n');

  try {
    const authResult = await backendAgent.run({
      feature: 'User login endpoint with JWT authentication',
      method: 'POST',
      route: '/api/auth/login',
      framework: 'express',
      database: 'postgresql',
      authentication: false, // This IS the auth endpoint
      validation: true,
      typescript: true,
      context: `
The endpoint should:
- Accept email and password in request body
- Validate input fields
- Check if user exists in database
- Compare password hash using bcrypt
- Generate JWT token on success
- Return user data and token
- Handle errors (user not found, wrong password, etc.)
`,
    });

    console.log('Endpoint Generated ✓\n');
    console.log('Endpoint:', authResult.method, authResult.endpoint);
    console.log('\nRoute Handler Code:');
    console.log('─'.repeat(60));
    console.log(authResult.code);
    console.log('─'.repeat(60));

    if (authResult.middleware) {
      console.log('\nMiddleware:');
      console.log(authResult.middleware);
    }

    if (authResult.model) {
      console.log('\nDatabase Model:');
      console.log(authResult.model);
    }

    if (authResult.dependencies) {
      console.log('\nRequired Packages:');
      authResult.dependencies.forEach((dep) => {
        console.log(`  npm install ${dep}`);
      });
    }

    if (authResult.notes) {
      console.log('\nImplementation Notes:');
      console.log(authResult.notes);
    }
  } catch (error) {
    console.error('❌ Error generating endpoint:', error);
  }

  console.log('\n' + '='.repeat(60) + '\n');

  // Example 2: Generate CRUD Endpoints
  console.log('📦 Example 2: Product CRUD Endpoint\n');

  try {
    const crudResult = await backendAgent.run({
      feature: 'Get all products with pagination and filtering',
      method: 'GET',
      route: '/api/products',
      framework: 'express',
      database: 'postgresql',
      authentication: true,
      validation: true,
      typescript: true,
      context: `
The endpoint should:
- Support pagination (page, limit query params)
- Support filtering by category, price range, search term
- Support sorting (by name, price, date)
- Return total count and paginated results
- Include product details (id, name, price, category, image, stock)
- Handle database errors gracefully
`,
    });

    console.log('Endpoint Generated ✓\n');
    console.log('Endpoint:', crudResult.method, crudResult.endpoint);
    console.log('\nCode Preview:');
    console.log(crudResult.code.slice(0, 500) + '...\n');

    console.log('Success:', crudResult.success ? '✅' : '❌');
  } catch (error) {
    console.error('❌ Error generating endpoint:', error);
  }

  console.log('\n' + '='.repeat(60) + '\n');

  // Example 3: Generate File Upload Endpoint
  console.log('📤 Example 3: File Upload Endpoint\n');

  try {
    const uploadResult = await backendAgent.run({
      feature: 'Upload user profile image',
      method: 'POST',
      route: '/api/upload/avatar',
      framework: 'express',
      database: 'postgresql',
      authentication: true,
      validation: true,
      typescript: true,
      context: `
The endpoint should:
- Accept multipart/form-data with image file
- Validate file type (only jpg, png, webp)
- Validate file size (max 5MB)
- Resize image to 500x500px
- Generate unique filename
- Save to storage (local or S3)
- Update user profile with image URL
- Return the uploaded image URL
`,
    });

    console.log('Endpoint Generated ✓\n');
    console.log('Endpoint:', uploadResult.method, uploadResult.endpoint);

    if (uploadResult.middleware) {
      console.log('\nMiddleware Preview:');
      console.log(uploadResult.middleware.slice(0, 300) + '...');
    }

    if (uploadResult.dependencies) {
      console.log('\nDependencies:', uploadResult.dependencies.join(', '));
    }
  } catch (error) {
    console.error('❌ Error generating endpoint:', error);
  }

  console.log('\n' + '='.repeat(60) + '\n');

  // Show agent status
  console.log('Agent Status:', backendAgent.getStatus());
  console.log('Total Endpoints Generated:', 3);
}

main().catch(console.error);
