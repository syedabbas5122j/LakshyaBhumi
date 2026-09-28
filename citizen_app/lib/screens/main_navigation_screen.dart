import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/citizen_provider.dart';
import '../theme/app_theme.dart';
import 'home_screen.dart';
import 'map_screen.dart';
import 'profile_screen.dart';
import 'requests_list_screen.dart';

class MainNavigationScreen extends StatelessWidget {
  const MainNavigationScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final provider = Provider.of<CitizenProvider>(context);

    final List<Widget> screens = const [
      HomeScreen(),
      MapScreen(),
      RequestsListScreen(),
      ProfileScreen(),
    ];

    return Scaffold(
      body: IndexedStack(
        index: provider.currentTabIndex,
        children: screens,
      ),
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          color: AppTheme.paper,
          border: Border(
            top: BorderSide(color: AppTheme.line, width: 1),
          ),
        ),
        child: BottomNavigationBar(
          backgroundColor: AppTheme.paper,
          currentIndex: provider.currentTabIndex,
          onTap: (index) => provider.setTabIndex(index),
          items: const [
            BottomNavigationBarItem(
              icon: Icon(Icons.dashboard_outlined, size: 20),
              activeIcon: Icon(Icons.dashboard, size: 20),
              label: 'Workspace',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.map_outlined, size: 20),
              activeIcon: Icon(Icons.map, size: 20),
              label: 'Cadastre Map',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.rate_review_outlined, size: 20),
              activeIcon: Icon(Icons.rate_review, size: 20),
              label: 'Requests',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.person_outline, size: 20),
              activeIcon: Icon(Icons.person, size: 20),
              label: 'Account',
            ),
          ],
        ),
      ),
    );
  }
}
