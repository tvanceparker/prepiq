#!/usr/bin/env python3
"""
Test Runner for POS System
Executes all tests and provides comprehensive reporting
"""

import subprocess
import sys
import os
from pathlib import Path


def run_tests():
    """Run all tests with coverage reporting"""
    print("🚀 Starting POS System Test Suite")
    print("=" * 50)

    # Change to the project root directory
    project_root = Path(__file__).parent
    os.chdir(project_root)

    # Test commands to run
    test_commands = [
        {
            'name': 'Order Service Tests',
            'command': ['python', '-m', 'pytest', 'tests/orders/', '-v', '--tb=short']
        },
        {
            'name': 'POS Service Tests',
            'command': ['python', '-m', 'pytest', 'tests/pos/', '-v', '--tb=short']
        },
        {
            'name': 'Auth Service Tests',
            'command': ['python', '-m', 'pytest', 'tests/auth/', '-v', '--tb=short']
        },
        {
            'name': 'Integration Tests',
            'command': ['python', '-m', 'pytest', 'tests/orders/test_pos_integration.py', '-v', '--tb=short']
        },
        {
            'name': 'All Tests with Coverage',
            'command': [
                'python', '-m', 'pytest',
                'tests/',
                '--cov=app',
                '--cov-report=html',
                '--cov-report=term-missing',
                '-v'
            ]
        }
    ]

    results = []

    for test_config in test_commands:
        print(f"\n📋 Running {test_config['name']}")
        print("-" * 40)

        try:
            result = subprocess.run(
                test_config['command'],
                capture_output=True,
                text=True,
                timeout=300  # 5 minute timeout
            )

            if result.returncode == 0:
                print("✅ PASSED")
                results.append((test_config['name'], 'PASSED', result.stdout))
            else:
                print("❌ FAILED")
                print("STDOUT:", result.stdout)
                print("STDERR:", result.stderr)
                results.append((test_config['name'], 'FAILED', result.stdout + result.stderr))

        except subprocess.TimeoutExpired:
            print("⏰ TIMEOUT")
            results.append((test_config['name'], 'TIMEOUT', 'Test execution timed out'))
        except Exception as e:
            print(f"💥 ERROR: {e}")
            results.append((test_config['name'], 'ERROR', str(e)))

    # Print summary
    print("\n" + "=" * 50)
    print("📊 TEST SUMMARY")
    print("=" * 50)

    passed = 0
    failed = 0
    errors = 0

    for name, status, output in results:
        status_icon = {
            'PASSED': '✅',
            'FAILED': '❌',
            'TIMEOUT': '⏰',
            'ERROR': '💥'
        }.get(status, '❓')

        print(f"{status_icon} {name}: {status}")

        if status == 'PASSED':
            passed += 1
        elif status in ['FAILED', 'TIMEOUT', 'ERROR']:
            failed += 1
            if status == 'ERROR':
                errors += 1

    total = len(results)
    success_rate = (passed / total * 100) if total > 0 else 0

    print(f"\n📈 Results: {passed}/{total} passed ({success_rate:.1f}%)")

    if failed > 0:
        print(f"⚠️  {failed} test suites had issues")
        if errors > 0:
            print(f"💥 {errors} test suites had errors")

    # Generate coverage report if available
    if os.path.exists('htmlcov/index.html'):
        print("\n📄 Coverage report generated: htmlcov/index.html")
        print("   Open in browser to view detailed coverage information")
    return passed == total


if __name__ == '__main__':
    success = run_tests()
    sys.exit(0 if success else 1)
