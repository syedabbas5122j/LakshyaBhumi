import 'package:flutter_test/flutter_test.dart';
import 'package:citizen_app/main.dart';

void main() {
  testWidgets('BhoomiSync Citizen App smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(const LakshyaBhumiCitizenApp());
    expect(find.text('BhoomiSync'), findsOneWidget);
  });
}
