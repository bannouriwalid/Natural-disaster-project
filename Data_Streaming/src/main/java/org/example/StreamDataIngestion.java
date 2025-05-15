package org.example;

public class StreamDataIngestion {

    public static void main(String[] args) {

        Thread usgsThread = new Thread(() -> {
            try {
                UsgsEarthquakeProducer.main(null);
            } catch (Exception e) {
                System.err.println("Erreur dans USGS Thread : " + e.getMessage());
            }
        });

        Thread eonetThread = new Thread(() -> {
            try {
                NasaEonetProducer.main(null);
            } catch (Exception e) {
                System.err.println("Erreur dans EONET Thread : " + e.getMessage());
            }
        });

        Thread gdacsThread = new Thread(() -> {
            try {
                GdacsRssProducer.main(null);
            } catch (Exception e) {
                System.err.println("Erreur dans GDACS Thread : " + e.getMessage());
            }
        });

        // Lancement des threads
        usgsThread.start();
        eonetThread.start();
        gdacsThread.start();

        // Optionnel : attendre la fin des threads (dans ce cas, ils tournent indéfiniment)
        try {
            usgsThread.join();
            eonetThread.join();
            gdacsThread.join();
        } catch (InterruptedException e) {
            System.err.println("Thread interrompu : " + e.getMessage());
        }
    }
}
