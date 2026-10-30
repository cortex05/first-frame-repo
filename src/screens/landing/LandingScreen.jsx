import React from "react";
import TopNavbar from "../../components/top-navbar/TopNavbar";

import styles from "./LandingScreen.module.css";
import usePageTitle from "../../hooks/usePageTitle";

const holderParagraphs = [
  "First Frame is a Jury selection software for helping law firms both big and small. A user has a streamlined way of adding questions for their Voir Dire and then deciding how important each question is. During general questioning, their questions and importance can be easily recorded and tabulated. Once all questioning is complete, various ways of viewing which potential jurors are of greatest risk to your case.",
  "A new addition is a round for individual questions for on the fence candidates. You can ask whichever candidate whatever question has come to mind and you can add or subtract points based on their answers. This app does require an internet connection to use. However, we do have options to export PDFs of your questions and candidates to assist in your record keeping so you can still use the core feature of our app (albeit with more writing or typing on your part). Our application is currently approved for AA 2.1 standards. Screen readers can be used for the application.",
  "Hop right in HERE(not ready) to register a FREE account. We DO NOT use a subscription model. When you have jury selection, you purchase access for one week, giving you time to add your questions, practice your voir dire and do the actual Voir Dire. Once you have completed the case or a week has gone by, your results for the case will be archived for your viewing, allowing you to study the best outcomes."
]

// Placeholder marketing sections; content and copy will be replaced once final messaging is ready.
const SECTIONS = [
  { id: "intro", title: "Welcome to First Frame", variant: styles.sectionSubtle },
  { id: "features", title: "Everything You Need", variant: styles.sectionCard },
  { id: "cta", title: "Ready to Get Started?", variant: styles.sectionSubtle },
];

const LandingScreen = () => {
  usePageTitle("Welcome");
  return (
    <React.Fragment>
      <TopNavbar />

      <main className={styles.page}>
        <h1 className={styles.srOnly}>First Frame</h1>
        {SECTIONS.map((section, i) => (
          <section key={section.id} className={`${styles.section} ${section.variant}`}>
            <div className={styles.sectionContent}>
              <h2 className={styles.sectionTitle}>{section.title}</h2>
              <p className={styles.sectionText}>{holderParagraphs[i]}</p>
            </div>
          </section>
        ))}
      </main>
    </React.Fragment>
  );
};

export default LandingScreen;
