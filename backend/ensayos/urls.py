from django.urls import path

from . import views

urlpatterns = [
    path('salud/', views.salud, name='salud'),
    path('catalogos/', views.catalogos, name='catalogos'),
    path('ensayos/', views.ensayos, name='ensayos'),
    path('ensayos/phi/', views.ensayo_phi, name='ensayo-phi'),
    path('ensayos/por-accesorio/', views.por_accesorio, name='ensayos-por-accesorio'),
    path('ensayos/<int:pk>/', views.ensayo, name='ensayo'),
]
